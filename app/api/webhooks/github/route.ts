import { NextRequest, NextResponse } from "next/server";
import { extractTicketKey, isCommitFeedExcluded, verifyGithubSignature } from "@/lib/github";
import { getTicketByKey, moveTicket, setGithubRef } from "@/lib/tickets";
import { notifyDiscordCommit } from "@/lib/discord";

interface CreatePayload {
  ref: string;
  ref_type: string; // "branch" | "tag"
}

interface PushPayload {
  ref: string; // "refs/heads/<branch>"
  repository: { full_name: string; name: string };
  commits: Array<{
    id: string;
    message: string;
    url: string;
    distinct: boolean;
  }>;
}

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

  const event = req.headers.get("x-github-event");

  // A new branch named after a ticket means work has started on it.
  if (event === "create") {
    const payload: CreatePayload = JSON.parse(rawBody);
    if (payload.ref_type !== "branch") {
      return NextResponse.json({ ok: true, skipped: "not a branch" });
    }

    const key = extractTicketKey(payload.ref);
    if (!key) {
      return NextResponse.json({ ok: true, skipped: "no ticket key found" });
    }

    const ticket = await getTicketByKey(key);
    if (!ticket || !ticket._id) {
      return NextResponse.json({ ok: true, skipped: `no ticket ${key}` });
    }

    await moveTicket(ticket._id.toString(), { status: "in_progress" });
    return NextResponse.json({ ok: true, key, moved: "in_progress" });
  }

  // Raw commit activity feed — every distinct pushed commit, across every
  // repo with a webhook pointed here, posted to one shared Discord channel.
  // Not tied to tickets at all (no key lookup, no board movement).
  if (event === "push") {
    const payload: PushPayload = JSON.parse(rawBody);
    if (isCommitFeedExcluded(payload.repository.name)) {
      return NextResponse.json({ ok: true, skipped: "repo excluded from commit feed" });
    }
    const distinctCommits = payload.commits.filter((c) => c.distinct !== false);

    await Promise.all(
      distinctCommits.map((commit) =>
        notifyDiscordCommit(payload.repository.full_name, {
          id: commit.id,
          message: commit.message,
          url: commit.url,
          branch: payload.ref.replace(/^refs\/heads\//, ""),
        }),
      ),
    );

    return NextResponse.json({ ok: true, posted: distinctCommits.length });
  }

  if (event !== "pull_request") {
    return NextResponse.json({ ok: true, skipped: `event ${event} not handled` });
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

  // Opening the PR means it's ready for review/QA — Testing, not In Progress
  // (a branch existing already covered that transition).
  if (action === "opened") {
    await moveTicket(ticket._id.toString(), { status: "testing" });
    await setGithubRef(ticket._id.toString(), githubRef);
    return NextResponse.json({ ok: true, key, moved: "testing" });
  }

  if (action === "closed" && pr.merged) {
    await moveTicket(ticket._id.toString(), { status: "done" });
    await setGithubRef(ticket._id.toString(), githubRef);
    return NextResponse.json({ ok: true, key, moved: "done" });
  }

  return NextResponse.json({ ok: true, skipped: `action ${action} not handled` });
}
