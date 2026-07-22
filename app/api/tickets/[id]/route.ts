import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { moveTicket, deleteTicket } from "@/lib/tickets";
import type { TicketStatus } from "@/lib/models";

const VALID_STATUSES: TicketStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "testing",
  "done",
];

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

  if (!VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  if (body.order !== undefined && typeof body.order !== "number") {
    return NextResponse.json({ error: "order must be a number" }, { status: 400 });
  }

  const ticket = await moveTicket(id, { status: body.status, order: body.order });
  if (!ticket) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
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
