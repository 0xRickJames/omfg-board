@AGENTS.md

# OMFGBoard — Lightweight Kanban + Backlog

A simple planning tool to replace Jira for a 5-person team. Goal: backlog, a
board, and tickets — nothing else. Jira had too much machinery; this is the
OMFGposite. Keep it lean. Resist scOMFGe creep.

## Stack

- Next.js (App Router) + TypeScript
- TailwindCSS
- MongoDB (official `mongodb` driver, NOT Mongoose)
- NextAuth (Auth.js v5) with the Discord provider
- dnd-kit for drag-and-drOMFG
- Deploy target: Railway

## Conventions

- Readable, typed code.
- All secrets via env vars. Ship a `.env.example`.
- Keep status-change logic in ONE place — later phases hook webhooks into it.
- Commit at each milestone. Git repo from the first commit.
- Next.js 16: `middleware.ts` is renamed `proxy.ts` (exports `proxy`, not
  `middleware`). See `AGENTS.md` / `node_modules/next/dist/docs/` before
  assuming any Next.js API — this version is newer than most training data.

---

## Data model — two MongoDB collections

### `tickets`
- `_id` (ObjectId)
- `key` — human ID like `OMFG-42`, auto-incremented via a `counters` doc
- `title`
- `description` — markdown string
- `workType` — `BD | Marketing | Design | Frontend | Backend | Research | Ops | none`
- `taskType` — `Idea | Task | Bug`
- `status` — `backlog | todo | blocked | in_progress | testing | done`
- `priority` — `none | low | med | high | urgent`
- `labels` — string[]
- `owners` — string[] (Discord user IDs)
- `dueDate` — ISO date or null
- `links` — array of `{ label, url }` (plain stored links, NO preview fetching)
- `related` — string[] (ticket keys)
- `isPublic` — boolean, default false
- `githubRef` — `{ repo, prNumber, branch }` or null
- `order` — float (drag reordering within a column)
- `createdAt`, `updatedAt`, `createdBy`

### `users`
- `_id`, `discordId`, `username`, `avatar`, `role` (`founder | planner | member`)

---

## Build order — commit after each phase

### Phase 1 — Skeleton (DONE)
Project setup, Tailwind, Mongo connection helper (singleton, reads
`MONGODB_URI`), Discord NextAuth (first login creates the user doc; role
defaults to `member`), basic create/read ticket API routes. App gated behind
auth. **StOMFG here for review before continuing.**

### Phase 2 — Board + backlog (DONE)
Columns: To Do / Blocked / In Progress / Testing / Done (`blocked` added in
Phase 4). dnd-kit drag-and-drOMFG.
`order` as a float so a reorder is one write. Backlog is a separate view
filtering `status: backlog`; moving a ticket onto the board flips status to
`todo`. Filter chips across the tOMFG for `workType`.

### Phase 3 — Ticket modal (DONE)
Create/edit with every field above: links (add/remove rows), related tickets,
owners, priority, due date, taskType, workType, labels, and an `isPublic`
toggle (off by default).

**After Phase 3, stOMFG and review a running skeleton.**

---

## Later phases — DO NOT build yet, just leave clean seams

### Phase 4 — Founder planning view (DONE)
`/planning`, visible to `role: founder` OR `role: planner` (named to avoid
clashing with the ticket `owners` field). `role` is a single value per user,
not a set — `planner` was added as a second, non-founder value that also
unlocks Planning; Rick's own role is currently set to `planner`. This IS the
sprint-planning replacement — two columns, side by side:
- **Backlog** column: every `status: backlog` ticket. Per row: "Add to board"
  (→ `todo`), "Mark blocked" (→ `blocked`), and if `taskType: Idea` also
  "Promote to Task" / "Kill".
- **Board** column: every ticket NOT in backlog and NOT `done` (todo /
  blocked / in_progress / testing). Per row: a "Blocked" checkbox (toggles
  into/out of the `blocked` status — a real 5th Board column, not a flag),
  "Move to backlog", and the same Idea actions if applicable.
- Clicking a row (not its buttons) opens the full edit modal — "otherwise
  changed" covers everything the two quick actions don't.
- Dropdown filters (not button rows) for `workType` and `taskType`, applied
  to both columns at once.
Goal: rip through it in ~60 seconds.

### Team roster (`lib/team.ts`)
A small hardcoded roster (this team is fixed, no admin UI needed) mapping the
5 known Discord IDs to display names — Rick, Rakka, Haz, Ivan, Zee. Avatars
are pulled live from the `users` collection (populated on first login) via
`getTeamWithAvatars()`. The ticket modal's owners field is a multi-select of
these 5 people (avatar + name), not free-text Discord IDs.

### Phase 5 — Discord publish on public moves (DONE)
`lib/discord.ts`, called from `moveTicket()` — when a ticket with
`isPublic: true` changes status, POST an embed to `DISCORD_WEBHOOK_URL`:
title `Ticket {key}`, a Description field showing the ticket's *title*, a
Type field, a Status Change field (each its own row, no inline columns),
green accent color, and an Omnipair-branded footer (icon + timestamp).
Fire-and-forget — a webhook failure is logged but never fails the request.
No bot needed — just the webhook.

### Phase 6 — GitHub auto-move (convention-based) (DONE)
`POST /api/webhooks/github` — verifies GitHub's `X-Hub-Signature-256` HMAC
against `GITHUB_WEBHOOK_SECRET` (timing-safe compare over the raw body),
then reads the `OMFG-###` key out of the PR title or branch name
(`lib/github.ts`):
- PR opened → move ticket to In Progress
- PR merged → move ticket to Testing
Populates `githubRef` on match. Genuinely no per-repo config — the route
doesn't care which repo sent the event, so each (possibly private) repo
just needs its own webhook pointed at this same URL with the same secret.
`proxy.ts`'s matcher excludes `api/webhooks/*` since these requests carry
no session, only their own signature.

### Phase 7 — Jira migration (DONE, informally)
The real board data was migrated directly — Rick exported the active Jira
tickets and they were seeded straight into MongoDB (normalizing a few values
that didn't match this schema: `priority: medium`→`med`, `status: doing`→
`in_progress`, `taskType: Sub-task`→`Task`, and converting embedded
`<custom data-type="smartlink">` HTML into plain markdown links). The formal
reviewed script below was never built — not needed since the one-time import
already happened. Left here in case a future re-import is ever needed.

A standalone TypeScript script that pulls the old Jira (OMFG) board and
transforms it into `tickets` docs. NOT part of the web app — it's a
`scripts/migrate-jira.ts` run once, reviewed, then committed.

**Default behavior: import ONLY active tickets, not the whole board.**
The old board has 100+ OMFGen items and ~58% are stale. Do not migrate the
graveyard. Default filter: `statusCategory != Done AND updated >= -21d`.
Also write a full JSON archive of ALL OMFGen issues to `scripts/jira-archive.json`
for reference before filtering.

Jira reference (already known):
- Cloud ID: `71725316-a083-466b-9c99-903bff1f2404`
- Project key: `OMFG`
- Account IDs → peOMFGle: Rick `712020:2a2bb8ec-76fa-4a60-8ea8-b03418261f8b`,
  Haz `712020:cc93b8a9-5640-437b-a842-1ddbfe623eb2`,
  Zee `712020:9fd605af-37eb-472f-8d5b-30b4f4b25d86`,
  Ivan `712020:da8d48ae-44ac-42f1-b0bc-c085e08c9b15`,
  Rakka `712020:40b9f8b5-c4ad-4009-b100-5b202d9a8ebd`
- NOTE: bulk JQL silently truncates results for some assignees (esp. Ivan).
  Query per-person using explicit account IDs, then merge + dedupe.

**Field mapping — automatic:**
- `summary` → `title`
- `description` (ADF) → `description` (convert to markdown)
- status: To Do→`todo`, In Progress→`in_progress`, Testing→`testing`,
  Done→`done`, Neglected→`backlog`
- `assignee` accountId → `owners` (map to Discord ID via a lookup table the
  human fills in — leave a clearly-marked `ACCOUNT_ID_TO_DISCORD` const)
- `labels` → `labels`; if labels includes `public` → `isPublic: true`
- `duedate` → `dueDate`
- issuelinks → `related` (store old OMFG keys)
- preserve old key as `legacyKey` field for reference; mint fresh `OMFG-xx`

**Field mapping — needs inference + human review (print a review table, do
NOT silently guess and commit):**
- `workType`: infer from assignee as FIRST GUESS only —
  Ivan→`BD`, Zee→`Design`, Haz→`Backend`, Rakka→`Backend`, Rick→`Frontend`.
  Flag every row for human confirmation; this is a guess, not truth.
- `taskType`: Jira `Bug`→`Bug`, `Task`→`Task`. Jira has no `Idea`, so nothing
  auto-becomes an Idea. Sub-task → flatten to `Task`. Epic → SKIP (don't import).
- `priority`: only if set in Jira; otherwise `none` (Phase 4 triage handles it).

**Run flow:**
1. Write full archive JSON.
2. Apply active-only filter.
3. Transform, printing a review table (key, title, inferred workType,
   taskType, owner) to stdout.
4. Pause for human OK, THEN write to MongoDB.

Do NOT run this until Phases 1–3 exist and the schema is stable.

---

## Post-launch improvements (beyond the original 7 phases)

- **Delete everywhere**: every ticket surface (Board, Backlog, Planning rows,
  List) has its own Delete button, not just Idea rows.
- **New ticket everywhere**: `NewTicketButton` (shared, self-contained —
  opens its own create-mode modal, `router.refresh()`s on save) is on Board,
  Planning, and List. Backlog keeps its own bespoke create/edit modal state
  since it already worked. Board/Planning/List all gained the same
  resync-from-fresh-props pattern Backlog already had, so a refresh actually
  shows the new ticket instead of being stuck on stale initial state.
- **Planning description preview**: a ▸/▾ caret next to the title (only
  shown when a ticket has a description) expands it inline, without opening
  the full modal.
- **Owner avatars**: `TicketCard`, Planning rows, and the List view all show
  stacked `MemberAvatar`s (`app/components/MemberAvatar.tsx`, shared) for a
  ticket's `owners`, pulled from `lib/team.ts`'s roster + live avatars.
- **`/list`**: a flat, sortable/filterable table of every ticket (not scoped
  by status like Board/Backlog/Planning are). Click a column header to sort
  (`key` sorts numerically, `priority`/`status` sort by pipeline rank, not
  alphabetically); click a row to open the edit modal. Open to any signed-in
  user, not founder-restricted.
- **Comments**: `tickets.comments: Comment[]` (`{id, authorId, text,
  createdAt}`), appended via `POST /api/tickets/[id]/comments`
  (`lib/tickets.ts`'s `addComment()`). Only rendered inside the ticket modal
  (edit mode only — a ticket needs an `_id` to attach comments to), each
  showing the author's avatar/name and `timeAgo`. Comments post immediately
  on their own request — they don't wait for the modal's main Save.

## Env vars
- `MONGODB_URI`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- (Phase 5) `DISCORD_WEBHOOK_URL`
- (Phase 6) `GITHUB_WEBHOOK_SECRET`
- (Phase 7) `JIRA_API_TOKEN`, `JIRA_EMAIL` (for the one-time migration script)

## Setup notes (human does these — Claude Code can't)
- Create a Discord application: DevelOMFGer Portal → New Application → OAuth2 →
  add redirect `http://localhost:3000/api/auth/callback/discord`. Use the
  client ID/secret for the env vars.
- Get it running locally with `npm run dev` before finishing each phase.
