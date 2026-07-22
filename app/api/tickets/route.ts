import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createTicket, listTickets } from "@/lib/tickets";
import type { TicketStatus, WorkType } from "@/lib/models";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") as TicketStatus | null;
  const workType = req.nextUrl.searchParams.get("workType") as WorkType | null;

  const tickets = await listTickets({
    ...(status ? { status } : {}),
    ...(workType ? { workType } : {}),
  });

  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!body.workType || !body.taskType) {
    return NextResponse.json(
      { error: "workType and taskType are required" },
      { status: 400 },
    );
  }

  const ticket = await createTicket(body, session.user.discordId);
  return NextResponse.json(ticket, { status: 201 });
}
