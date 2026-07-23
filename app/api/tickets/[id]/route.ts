import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { moveTicket, updateTicket, pickUpdateFields, deleteTicket } from "@/lib/tickets";
import type { Ticket, TicketStatus, WorkType, TaskType, Priority } from "@/lib/models";

const VALID_STATUSES: TicketStatus[] = [
  "backlog",
  "todo",
  "blocked",
  "in_progress",
  "testing",
  "done",
];
const VALID_WORK_TYPES: WorkType[] = [
  "BD",
  "Marketing",
  "Design",
  "Frontend",
  "Backend",
  "Research",
];
const VALID_TASK_TYPES: TaskType[] = ["Idea", "Task", "Bug"];
const VALID_PRIORITIES: Priority[] = ["none", "low", "med", "high", "urgent"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // Drag-and-drop moves send only {status, order}; the edit modal can send
  // both a status change and the rest of the fields in one request.
  const hasStatus = typeof body.status === "string";
  if (hasStatus && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  if (body.order !== undefined && typeof body.order !== "number") {
    return NextResponse.json({ error: "order must be a number" }, { status: 400 });
  }

  const updates = pickUpdateFields(body);
  if (updates.workType && !VALID_WORK_TYPES.includes(updates.workType)) {
    return NextResponse.json({ error: "invalid workType" }, { status: 400 });
  }
  if (updates.taskType && !VALID_TASK_TYPES.includes(updates.taskType)) {
    return NextResponse.json({ error: "invalid taskType" }, { status: 400 });
  }
  if (updates.priority && !VALID_PRIORITIES.includes(updates.priority)) {
    return NextResponse.json({ error: "invalid priority" }, { status: 400 });
  }
  if (!hasStatus && Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no valid fields to update" }, { status: 400 });
  }

  let ticket: Ticket | null = null;
  if (Object.keys(updates).length > 0) {
    ticket = await updateTicket(id, updates);
    if (!ticket) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
  }
  if (hasStatus) {
    ticket = await moveTicket(id, { status: body.status, order: body.order });
    if (!ticket) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
  }

  return NextResponse.json(ticket);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteTicket(id);
  if (!deleted) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
