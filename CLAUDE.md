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
- `workType` — `BD | Marketing | Design | Frontend | Backend | Research | Ops | Blockchain | none`
- `taskType` — `Idea | Task | Bug`
- `status` — `backlog | todo | blocked | in_progress | testing | done`
- `priority` — `none | low | med | high | urgent`
- `labels` — string[]
- `owners` — string[] (Discord user IDs)
- `dueDate` — ISO date or null
- `links` — array of `{ label, url }` (plain stored links, NO preview fetching)
- `related` — string[] (ticket keys)
- `parentKey` — ticket key or null; a plain key reference (like `related`, no
  relational integrity/cascade) that makes this ticket a subtask of another
- `isPublic` — boolean, default false
- `githubRef` — `{ repo, prNumber, branch }` or null
- `order` — float (drag reordering within a column)
- `createdAt`, `updatedAt`, `createdBy`

### `users`
- `_id`, `discordId`, `username`, `avatar`, `role` (`founder | planner | member`)

### `integrations`
- Single doc, `_id: "google-calendar"` — `{ refreshToken, connectedBy, connectedAt }`.
  Whoever's Google identity is connected via `/api/google/connect` is the
  lens every teammate's Out-of-Office status gets read through.

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

- **Done means done**: `Ticket.doneAt` (set when status transitions to
  `done`, cleared if it moves back off `done`) is tracked separately from
  `updatedAt`, which changes on any edit and would otherwise reset the
  clock. Two things key off it: `lib/format.ts`'s `dueInfo()` now takes the
  ticket's status and always returns `null` for `done` tickets — a
  completed ticket can never show as overdue. And the Board page
  (`app/page.tsx`) filters `done` tickets older than a week out of what it
  sends to `BoardClient`, so completed work stops cluttering the active
  view; `/list` still shows everything regardless of age, so nothing is
  actually hidden/lost, just off the Board.
- **Clickable links**: `TicketCard` renders each ticket's `links` as
  clickable text (only when any exist); the modal's link editor got a small
  ↗ open-in-new-tab affordance next to each row.
- **Mobile-responsive layout**: Nav wraps/stacks on narrow screens, Board's
  columns scroll horizontally instead of squeezing unreadably thin,
  Planning's two-column grid collapses to one column below `md`, and every
  page's filter-bar+action-button header row stacks vertically on mobile.
- **Modal never closes on an outside click**: an accidental backdrop click
  used to silently discard an in-progress edit with no way back. Now only
  Cancel/✕ or a successful save closes it.
- **Due-date timezone fix**: `dueInfo()` used to parse the plain
  `YYYY-MM-DD` `dueDate` as UTC midnight (per the JS spec for date-only
  strings) and diff it against a raw `Date.now()` — anyone behind UTC could
  see a same-day-due ticket marked overdue once it got late enough locally.
  Now compares calendar days in the viewer's own local timezone instead
  (this only ever runs client-side, so it's correctly per-viewer with no
  server config needed).
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
- **Dedicated ticket pages**: every ticket has a real URL, `/tickets/[key]`
  (`app/tickets/[key]/page.tsx`, a Server Component using
  `getTicketByKey`/`notFound()`). The form/comments UI is shared across
  every ticket surface via `TicketForm` (`app/components/TicketForm.tsx`,
  extracted from what used to be all of `TicketModal.tsx`). Clicking an
  existing ticket anywhere (Board, Backlog, Planning, List) navigates to
  `/tickets/[key]` — normally that's intercepted by
  `app/@modal/(.)tickets/[key]/page.tsx` (a Next.js intercepting route
  rendered through the `@modal` parallel-route slot in `app/layout.tsx`)
  and shown as the same centered `TicketModal` (backdrop dimmed, closes via
  Cancel/✕ or a successful save, never on an outside click) instead of a
  full navigation; closing it is `router.back()`, saving does
  `router.refresh()` + `router.back()` so the underlying list picks up the
  change via its existing resync-from-fresh-props pattern. The modal has an
  "Open full page ↗" link (`target="_blank"`, edit mode only) for anyone
  who wants the standalone page specifically. A hard refresh or direct link
  visit on `/tickets/[key]` bypasses the interception and renders the real
  full page. (A right-side slide-in sidebar was tried first instead of the
  modal for viewing/editing existing tickets, then reverted — Rick preferred
  the centered modal.) `ticket.key` is still a real `<Link>` on every
  row/card as a bonus affordance for power users, but the row/card itself
  also navigates via `router.push` so the modal opens no matter where on it
  you click. `app/@modal/default.tsx` (returning `null`) is required by
  Next 16 for any unmatched parallel-route slot.
- **Subtasks**: any ticket can have a `parentKey` pointing at another
  ticket's key — subtasks are full independent tickets (their own key,
  status, column, owners; they show up on the Board/Backlog/List/Planning
  like anything else), not a nested checklist item. `lib/tickets.ts`'s
  `getSubtaskCounts(parentKeys)` is a single aggregate query per page load
  that returns `{done, total}` keyed by parent key; each page (`app/page.tsx`,
  `app/backlog/page.tsx`, `app/planning/page.tsx`, `app/list/page.tsx`)
  computes it for the tickets it fetched and passes it down as a `progress`
  prop, rendered as a small bar+count (`app/components/SubtaskProgress.tsx`)
  on `TicketCard`, Planning's rows, and a dedicated List column.
  `TicketForm.tsx` has a "Parent ticket" dropdown (works identically in
  create and edit mode, so re-parenting an existing ticket is just changing
  this field and saving) plus a Subtasks section (edit mode only) that
  fetches `GET /api/tickets?parentKey=...` on mount and lists each subtask
  with a link to its standalone page; "+ Add subtask" opens a nested create
  `TicketModal` pre-filled with the current ticket's key as
  `defaultParentKey` (TicketForm and TicketModal import each other — a
  deliberate circular import, since TicketModal wraps TicketForm and
  TicketForm needs TicketModal for this nested creator; Next.js/Turbopack
  handles it fine since neither uses the other at module-eval time, only
  inside render). No cascade behavior on delete — deleting a parent leaves
  its subtasks with a dangling `parentKey`, same as `related`. The parent
  dropdown is a real `<select>` (not free text), sourced from `GET
  /api/tickets` and excluding the ticket itself and its own current
  subtasks (cheap one-level cycle guard, not full ancestry cycle detection).
  Options are ordered by "recently viewed" first — `lib/recentTickets.ts`
  keeps a per-browser `localStorage` list (deliberately client-only/local,
  not a shared DB field like `doneAt`, since "recently viewed by me" is
  inherently per-viewer), recorded whenever `TicketForm` opens in edit mode;
  everything else falls back to newest-key-first via `lib/format.ts`'s
  `keyNumber()` (also used by `ListClient`'s key-column sort).
- **Google Calendar out-of-office banner**: `TEAM_ROSTER` in `lib/team.ts`
  now carries each person's Workspace `googleEmail`. A single founder
  connects their own Google identity once via `/api/google/connect` (Nav has
  a founder-only "Connect Google Calendar" link showing status) —
  `app/api/google/connect/route.ts` redirects to Google's OAuth consent
  screen (`calendar.readonly` scope, `prompt=consent` to force a
  `refresh_token`, a CSRF `state` cookie), `app/api/google/callback/route.ts`
  exchanges the code and stores the refresh token via
  `lib/googleAuth.ts`/`integrations` collection. Deliberately a *separate*
  path from `/api/auth/*` — that prefix is wholly owned by NextAuth's
  `[...nextauth]` catch-all and would otherwise swallow/mishandle these
  requests. `lib/googleCalendar.ts`'s `listCurrentOutOfOffice()` mints a
  fresh access token from the stored refresh token per call (simplicity over
  caching, at this traffic volume) and queries the Calendar API's
  `events.list` with `eventTypes=outOfOffice` for each teammate's calendar —
  this relies on the connected account already having calendar-sharing
  visibility into the rest of the Workspace org (true here, per Rick).
  Per-person fetch failures (e.g. a calendar not actually shared) are
  swallowed via `Promise.allSettled` so one bad calendar doesn't blank the
  whole banner. `app/components/OutOfOfficeBanner.tsx` renders above the
  Board only (`app/page.tsx`) and renders nothing if nobody's currently out.

## Env vars
- `MONGODB_URI`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- (Phase 5) `DISCORD_WEBHOOK_URL`
- (Phase 6) `GITHUB_WEBHOOK_SECRET`
- (Phase 7) `JIRA_API_TOKEN`, `JIRA_EMAIL` (for the one-time migration script)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (out-of-office banner)

## Setup notes (human does these — Claude Code can't)
- Create a Discord application: DevelOMFGer Portal → New Application → OAuth2 →
  add redirect `http://localhost:3000/api/auth/callback/discord`. Use the
  client ID/secret for the env vars.
- Google Calendar: create a Cloud project → enable the Calendar API →
  OAuth consent screen set to **Internal** (avoids review + the 7-day
  refresh-token expiry unverified "External" apps get) → OAuth client
  (Web application) with redirect URIs
  `https://omfgboard.info/api/google/callback` and
  `http://localhost:3000/api/google/callback`. Then, signed in as a
  founder, visit `/api/google/connect` once.
- Get it running locally with `npm run dev` before finishing each phase.
