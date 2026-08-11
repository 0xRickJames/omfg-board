"use client";

import { useEffect, useState } from "react";
import type { TicketDTO, CommentDTO } from "@/lib/tickets";
import type { WorkType, TaskType, Priority, TicketStatus, TicketLink } from "@/lib/models";
import type { TeamMember } from "@/lib/team";
import { timeAgo } from "@/lib/format";
import MemberAvatar from "@/app/components/MemberAvatar";
import TicketModal from "@/app/components/TicketModal";

interface SubtaskSummary {
  _id: string;
  key: string;
  title: string;
  status: TicketStatus;
}

const WORK_TYPES: WorkType[] = [
  "BD",
  "Marketing",
  "Design",
  "Frontend",
  "Backend",
  "Research",
  "Ops",
  "Blockchain",
  "none",
];
const TASK_TYPES: TaskType[] = ["Idea", "Task", "Bug"];
const PRIORITIES: Priority[] = ["none", "low", "med", "high", "urgent"];
const STATUSES: { value: TicketStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "blocked", label: "Blocked" },
  { value: "in_progress", label: "In Progress" },
  { value: "testing", label: "Testing" },
  { value: "done", label: "Done" },
];

function parseList(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The actual ticket create/edit form + comments — shared by TicketModal (the
 * in-page overlay opened from a card/row click) and the dedicated /tickets/[key]
 * page (both the real page and its intercepted-route overlay variant).
 */
export default function TicketForm({
  ticket,
  team,
  onSaved,
  onCancel,
  defaultParentKey,
}: {
  ticket: TicketDTO | null;
  team: TeamMember[];
  onSaved: (ticket: TicketDTO) => void;
  onCancel: () => void;
  /** Pre-fills the parent field when opened via a parent ticket's "+ Add subtask". */
  defaultParentKey?: string;
}) {
  const mode = ticket ? "edit" : "create";

  const [title, setTitle] = useState(ticket?.title ?? "");
  const [description, setDescription] = useState(ticket?.description ?? "");
  const [workType, setWorkType] = useState<WorkType>(ticket?.workType ?? "Frontend");
  const [taskType, setTaskType] = useState<TaskType>(ticket?.taskType ?? "Task");
  const [priority, setPriority] = useState<Priority>(ticket?.priority ?? "none");
  const [status, setStatus] = useState<TicketStatus>(ticket?.status ?? "backlog");
  const [labelsText, setLabelsText] = useState((ticket?.labels ?? []).join(", "));
  const [owners, setOwners] = useState<string[]>(ticket?.owners ?? []);
  const [showOwnerPicker, setShowOwnerPicker] = useState(false);
  const [dueDate, setDueDate] = useState(ticket?.dueDate ?? "");
  const [links, setLinks] = useState<TicketLink[]>(ticket?.links ?? []);
  const [relatedText, setRelatedText] = useState((ticket?.related ?? []).join(", "));
  const [parentKeyText, setParentKeyText] = useState(
    ticket?.parentKey ?? defaultParentKey ?? "",
  );
  const [isPublic, setIsPublic] = useState(ticket?.isPublic ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [comments, setComments] = useState<CommentDTO[]>(ticket?.comments ?? []);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const [subtasks, setSubtasks] = useState<SubtaskSummary[]>([]);
  const [addingSubtask, setAddingSubtask] = useState(false);

  useEffect(() => {
    if (mode !== "edit") return;
    fetchSubtasks();
    // Only needs to run once per ticket the form was opened for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchSubtasks() {
    if (!ticket) return;
    const res = await fetch(`/api/tickets?parentKey=${encodeURIComponent(ticket.key)}`);
    if (res.ok) {
      setSubtasks(await res.json());
    }
  }

  function updateLink(index: number, field: keyof TicketLink, value: string) {
    setLinks((prev) =>
      prev.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
    );
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function addOwner(discordId: string) {
    setOwners((prev) => (prev.includes(discordId) ? prev : [...prev, discordId]));
    setShowOwnerPicker(false);
  }

  function removeOwner(discordId: string) {
    setOwners((prev) => prev.filter((id) => id !== discordId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      title,
      description,
      workType,
      taskType,
      priority,
      status,
      labels: parseList(labelsText),
      owners,
      dueDate: dueDate || null,
      links: links.filter((l) => l.label.trim() && l.url.trim()),
      related: parseList(relatedText).map((k) => k.toUpperCase()),
      parentKey: parentKeyText.trim() ? parentKeyText.trim().toUpperCase() : null,
      isPublic,
    };

    const res = await fetch(
      mode === "create" ? "/api/tickets" : `/api/tickets/${ticket!._id}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save ticket");
      return;
    }

    const saved: TicketDTO = await res.json();
    onSaved(saved);
  }

  async function handlePostComment() {
    if (!ticket || !commentText.trim()) return;
    setPostingComment(true);
    const res = await fetch(`/api/tickets/${ticket._id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: commentText.trim() }),
    });
    setPostingComment(false);
    if (res.ok) {
      const updated: TicketDTO = await res.json();
      setComments(updated.comments);
      setCommentText("");
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">
            Description (markdown)
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TicketStatus)}
              className="rounded border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Work type</label>
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value as WorkType)}
              className="rounded border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              {WORK_TYPES.map((w) => (
                <option key={w} value={w}>
                  {w === "none" ? "None" : w}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Type</label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType)}
              className="rounded border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="rounded border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">
            Labels (comma-separated)
          </label>
          <input
            value={labelsText}
            onChange={(e) => setLabelsText(e.target.value)}
            placeholder="urgent, needs-design"
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Owners</label>
          <div className="flex flex-wrap items-center gap-2">
            {owners.map((discordId) => {
              const member = team.find((m) => m.discordId === discordId);
              if (!member) return null;
              return (
                <span
                  key={discordId}
                  className="flex items-center gap-1.5 rounded-full bg-zinc-900 py-1 pl-1 pr-2 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
                >
                  <MemberAvatar member={member} />
                  {member.name}
                  <button
                    type="button"
                    onClick={() => removeOwner(discordId)}
                    aria-label={`Remove ${member.name}`}
                    className="text-white/70 hover:text-white dark:text-zinc-900/70 dark:hover:text-zinc-900"
                  >
                    ✕
                  </button>
                </span>
              );
            })}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOwnerPicker((prev) => !prev)}
                className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                + Add owner
              </button>
              {showOwnerPicker && (
                <div className="absolute left-0 top-full z-10 mt-1 flex min-w-32 flex-col gap-1 rounded border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                  {team
                    .filter((member) => !owners.includes(member.discordId))
                    .map((member) => (
                      <button
                        type="button"
                        key={member.discordId}
                        onClick={() => addOwner(member.discordId)}
                        className="flex items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      >
                        <MemberAvatar member={member} />
                        {member.name}
                      </button>
                    ))}
                  {team.every((member) => owners.includes(member.discordId)) && (
                    <span className="px-2 py-1 text-xs text-zinc-400">Everyone&apos;s added</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Due date</label>
          <input
            type="date"
            value={dueDate ?? ""}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-500">Links</label>
            <button
              type="button"
              onClick={() => setLinks((prev) => [...prev, { label: "", url: "" }])}
              className="text-xs text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              + Add link
            </button>
          </div>
          {links.map((link, i) => (
            <div key={i} className="flex flex-wrap gap-2 sm:flex-nowrap">
              <input
                value={link.label}
                onChange={(e) => updateLink(i, "label", e.target.value)}
                placeholder="Label"
                className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 sm:w-1/3"
              />
              <input
                value={link.url}
                onChange={(e) => updateLink(i, "url", e.target.value)}
                placeholder="https://..."
                className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              {link.url.trim() && (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  aria-label={`Open ${link.label || link.url}`}
                  title="Open link"
                >
                  ↗
                </a>
              )}
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="text-zinc-400 hover:text-red-600"
                aria-label="Remove link"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">
            Related tickets (keys, comma-separated)
          </label>
          <input
            value={relatedText}
            onChange={(e) => setRelatedText(e.target.value)}
            placeholder="OMFG-12, OMFG-15"
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">
            Parent ticket (key, optional — makes this a subtask)
          </label>
          <input
            value={parentKeyText}
            onChange={(e) => setParentKeyText(e.target.value)}
            placeholder="OMFG-12"
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Public
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {submitting ? "Saving…" : mode === "create" ? "Create ticket" : "Save"}
          </button>
        </div>
      </form>

      {mode === "edit" && (
        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-500">
              Subtasks
              {subtasks.length > 0 &&
                ` · ${subtasks.filter((s) => s.status === "done").length}/${subtasks.length}`}
            </label>
            <button
              type="button"
              onClick={() => setAddingSubtask(true)}
              className="text-xs text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              + Add subtask
            </button>
          </div>
          {subtasks.length > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-zinc-900 dark:bg-zinc-50"
                style={{
                  width: `${
                    (subtasks.filter((s) => s.status === "done").length / subtasks.length) * 100
                  }%`,
                }}
              />
            </div>
          )}
          {subtasks.length === 0 ? (
            <p className="text-xs text-zinc-500">No subtasks yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {subtasks.map((s) => (
                <li key={s._id} className="flex items-center gap-2 text-sm">
                  <span className={s.status === "done" ? "text-zinc-400 line-through" : ""}>
                    {s.title}
                  </span>
                  <a
                    href={`/tickets/${s.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto shrink-0 font-mono text-xs text-zinc-500 hover:underline"
                  >
                    {s.key} ↗
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {addingSubtask && ticket && (
        <TicketModal
          ticket={null}
          team={team}
          onClose={() => setAddingSubtask(false)}
          onSaved={() => {
            setAddingSubtask(false);
            fetchSubtasks();
          }}
          defaultParentKey={ticket.key}
        />
      )}

      {mode === "edit" && (
        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <label className="text-xs font-medium text-zinc-500">Comments</label>
          <div className="flex max-h-48 flex-col gap-3 overflow-y-auto">
            {comments.length === 0 && (
              <p className="text-xs text-zinc-500">No comments yet.</p>
            )}
            {comments.map((comment) => {
              const author = team.find((m) => m.discordId === comment.authorId);
              return (
                <div key={comment.id} className="flex items-start gap-2 text-sm">
                  {author ? (
                    <MemberAvatar member={author} />
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-full bg-zinc-400" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs text-zinc-500">
                      {author?.name ?? "Unknown"} · {timeAgo(comment.createdAt)}
                    </div>
                    <p className="whitespace-pre-wrap break-words">{comment.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handlePostComment();
                }
              }}
              placeholder="Add a comment…"
              className="flex-1 rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <button
              type="button"
              onClick={handlePostComment}
              disabled={postingComment || !commentText.trim()}
              className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              Post
            </button>
          </div>
        </div>
      )}
    </>
  );
}
