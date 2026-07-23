import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { Ticket, Counter, TicketStatus, WorkType, GithubRef } from "@/lib/models";
import { notifyDiscordStatusChange } from "@/lib/discord";

const KEY_PREFIX = "OMFG";

async function getNextTicketKey(): Promise<string> {
  const db = await getDb();
  const counters = db.collection<Counter>("counters");
  const result = await counters.findOneAndUpdate(
    { _id: KEY_PREFIX },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  const seq = result?.seq ?? 1;
  return `${KEY_PREFIX}-${seq}`;
}

export interface CreateTicketInput {
  title: string;
  description?: string;
  workType: WorkType;
  taskType: Ticket["taskType"];
  status?: TicketStatus;
  priority?: Ticket["priority"];
  labels?: string[];
  owners?: string[];
  dueDate?: string | null;
  links?: Ticket["links"];
  related?: string[];
  isPublic?: boolean;
}

export async function createTicket(
  input: CreateTicketInput,
  createdBy: string,
): Promise<Ticket> {
  const db = await getDb();
  const tickets = db.collection<Ticket>("tickets");

  const key = await getNextTicketKey();
  const now = new Date();

  const ticket: Ticket = {
    key,
    title: input.title,
    description: input.description ?? "",
    workType: input.workType,
    taskType: input.taskType,
    status: input.status ?? "backlog",
    priority: input.priority ?? "none",
    labels: input.labels ?? [],
    owners: input.owners ?? [],
    dueDate: input.dueDate ?? null,
    links: input.links ?? [],
    related: input.related ?? [],
    isPublic: input.isPublic ?? false,
    githubRef: null,
    order: Date.now(),
    createdAt: now,
    updatedAt: now,
    createdBy,
  };

  const result = await tickets.insertOne(ticket);
  return { ...ticket, _id: result.insertedId };
}

export interface ListTicketsFilter {
  status?: TicketStatus;
  workType?: WorkType;
}

export async function listTickets(
  filter: ListTicketsFilter = {},
): Promise<Ticket[]> {
  const db = await getDb();
  const tickets = db.collection<Ticket>("tickets");
  return tickets.find(filter).sort({ order: 1 }).toArray();
}

export async function getTicketByKey(key: string): Promise<Ticket | null> {
  const db = await getDb();
  const tickets = db.collection<Ticket>("tickets");
  return tickets.findOne({ key });
}

export interface MoveTicketInput {
  status: TicketStatus;
  /** Omit to append the ticket to the end of its new column. */
  order?: number;
}

/**
 * The single place a ticket's status/order changes. Later phases (Discord
 * publish, GitHub auto-move) hook their side effects in here.
 */
export async function moveTicket(
  id: string,
  { status, order }: MoveTicketInput,
): Promise<Ticket | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const tickets = db.collection<Ticket>("tickets");

  const before = await tickets.findOne({ _id: new ObjectId(id) });
  if (!before) return null;

  const statusChanged = before.status !== status;
  const set: Partial<Ticket> = { status, updatedAt: new Date() };
  if (order !== undefined) {
    set.order = order;
  } else if (statusChanged) {
    // Moved to a new column with no explicit position (e.g. from the
    // Planning checklist) — append to the end. If status didn't change and
    // no order was given (e.g. the edit modal saving unrelated fields),
    // leave the ticket's position alone.
    set.order = Date.now();
  }

  const after = await tickets.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: set },
    { returnDocument: "after" },
  );
  if (!after) return null;

  if (statusChanged && before.isPublic) {
    notifyDiscordStatusChange(after, before.status).catch((err) => {
      console.error("Discord webhook failed", err);
    });
  }

  return after;
}

/** Populates a ticket's GitHub PR reference — set by the GitHub webhook on match. */
export async function setGithubRef(
  id: string,
  githubRef: GithubRef,
): Promise<Ticket | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const tickets = db.collection<Ticket>("tickets");
  return tickets.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { githubRef, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  workType?: WorkType;
  taskType?: Ticket["taskType"];
  priority?: Ticket["priority"];
  labels?: string[];
  owners?: string[];
  dueDate?: string | null;
  links?: Ticket["links"];
  related?: string[];
  isPublic?: boolean;
}

/** Whitelists edit-modal fields out of a raw request body (status/order/key/etc. are not editable here). */
export function pickUpdateFields(body: Record<string, unknown>): UpdateTicketInput {
  const updates: UpdateTicketInput = {};
  if (typeof body.title === "string") updates.title = body.title;
  if (typeof body.description === "string") updates.description = body.description;
  if (typeof body.workType === "string") updates.workType = body.workType as WorkType;
  if (typeof body.taskType === "string") {
    updates.taskType = body.taskType as Ticket["taskType"];
  }
  if (typeof body.priority === "string") {
    updates.priority = body.priority as Ticket["priority"];
  }
  if (Array.isArray(body.labels)) updates.labels = body.labels as string[];
  if (Array.isArray(body.owners)) updates.owners = body.owners as string[];
  if (body.dueDate === null || typeof body.dueDate === "string") {
    updates.dueDate = body.dueDate;
  }
  if (Array.isArray(body.links)) updates.links = body.links as Ticket["links"];
  if (Array.isArray(body.related)) updates.related = body.related as string[];
  if (typeof body.isPublic === "boolean") updates.isPublic = body.isPublic;
  return updates;
}

export async function updateTicket(
  id: string,
  input: UpdateTicketInput,
): Promise<Ticket | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const tickets = db.collection<Ticket>("tickets");
  return tickets.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...input, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
}

export async function deleteTicket(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDb();
  const tickets = db.collection<Ticket>("tickets");
  const result = await tickets.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

// Plain-JSON shape for passing tickets from Server to Client Components
// (ObjectId isn't a serializable RSC prop type).
export type TicketDTO = Omit<Ticket, "_id" | "createdAt" | "updatedAt"> & {
  _id: string;
  createdAt: string;
  updatedAt: string;
};

export function toTicketDTO(t: Ticket): TicketDTO {
  return {
    ...t,
    _id: t._id!.toString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
