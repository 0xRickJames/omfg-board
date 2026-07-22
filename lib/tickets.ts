import "server-only";
import { getDb } from "@/lib/mongodb";
import type { Ticket, Counter, TicketStatus, WorkType } from "@/lib/models";

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
