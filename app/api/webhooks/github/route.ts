import { NextRequest, NextResponse } from "next/server";
import { extractTicketKey, verifyGithubSignature } from "@/lib/github";
import { getTicketByKey, moveTicket, setGithubRef } from "@/lib/tickets";

interface PullRequestPayload {
  action: string;
  pull_request: {
    title: string;
    number: number;
    merged: boolean;
    head: { ref: string };
  };
  repository: { full_name: string };
}

export async function POST(req: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  if (!verifyGithubSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  if (req.headers.get("x-github-event") !== "pull_request") {
    return NextResponse.json({ ok: true, skipped: "not a pull_request event" });
  }

  const payload: PullRequestPayload = JSON.parse(rawBody);
  const { action, pull_request: pr, repository } = payload;

  const key = extractTicketKey(pr.title, pr.head.ref);
  if (!key) {
    return NextResponse.json({ ok: true, skipped: "no ticket key found" });
  }

  const ticket = await getTicketByKey(key);
  if (!ticket || !ticket._id) {
    return NextResponse.json({ ok: true, skipped: `no ticket ${key}` });
  }

  const githubRef = { repo: repository.full_name, prNumber: pr.number, branch: pr.head.ref };

  if (action === "opened") {
    await moveTicket(ticket._id.toString(), { status: "in_progress" });
    await setGithubRef(ticket._id.toString(), githubRef);
    return NextResponse.json({ ok: true, key, moved: "in_progress" });
  }

  if (action === "closed" && pr.merged) {
    await moveTicket(ticket._id.toString(), { status: "testing" });
    await setGithubRef(ticket._id.toString(), githubRef);
    return NextResponse.json({ ok: true, key, moved: "testing" });
  }

  return NextResponse.json({ ok: true, skipped: `action ${action} not handled` });
}
