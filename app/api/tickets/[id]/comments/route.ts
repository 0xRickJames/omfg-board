import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { addComment } from "@/lib/tickets";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const ticket = await addComment(id, session.user.discordId, text);
  if (!ticket) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(ticket);
}
