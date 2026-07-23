"use client";

import { useMemo, useState } from "react";
import type { TicketDTO } from "@/lib/tickets";
import { STATUS_LABELS, type TicketStatus } from "@/lib/models";
import type { TeamMember } from "@/lib/team";
import { timeAgo, dueInfo } from "@/lib/format";
import {
  ALL_TICKET_FILTERS,
  matchesTicketFilters,
  collectLabels,
  type TicketFilterValues,
} from "@/lib/ticketFilters";
import TicketFilters from "@/app/components/TicketFilters";
import TicketModal from "@/app/components/TicketModal";
import MemberAvatar from "@/app/components/MemberAvatar";
import NewTicketButton from "@/app/components/NewTicketButton";

function patchTicket(id: string, body: Record<string, unknown>) {
  fetch(`/api/tickets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function PlanningClient({
  initialBacklogTickets,
  initialBoardTickets,
  team,
}: {
  initialBacklogTickets: TicketDTO[];
  initialBoardTickets: TicketDTO[];
  team: TeamMember[];
}) {
  const [backlogTickets, setBacklogTickets] = useState(initialBacklogTickets);
  const [boardTickets, setBoardTickets] = useState(initialBoardTickets);
  const [prevInitialBacklog, setPrevInitialBacklog] = useState(initialBacklogTickets);
  const [prevInitialBoard, setPrevInitialBoard] = useState(initialBoardTickets);
  const [filters, setFilters] = useState<TicketFilterValues>(ALL_TICKET_FILTERS);
  const [editingTicket, setEditingTicket] = useState<TicketDTO | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // initialBacklogTickets/initialBoardTickets come from a fresh server fetch
  // on every router.refresh() (e.g. after creating a ticket) — resync local
  // state when they change.
  if (initialBacklogTickets !== prevInitialBacklog) {
    setPrevInitialBacklog(initialBacklogTickets);
    setBacklogTickets(initialBacklogTickets);
  }
  if (initialBoardTickets !== prevInitialBoard) {
    setPrevInitialBoard(initialBoardTickets);
    setBoardTickets(initialBoardTickets);
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const labelOptions = useMemo(
    () => collectLabels(backlogTickets, boardTickets),
    [backlogTickets, boardTickets],
  );

  const visibleBacklog = useMemo(
    () => backlogTickets.filter((t) => matchesTicketFilters(t, filters)),
    [backlogTickets, filters],
  );
  const visibleBoard = useMemo(
    () => boardTickets.filter((t) => matchesTicketFilters(t, filters)),
    [boardTickets, filters],
  );

  function moveToBoard(id: string) {
    const ticket = backlogTickets.find((t) => t._id === id);
    if (!ticket) return;
    setBacklogTickets((prev) => prev.filter((t) => t._id !== id));
    setBoardTickets((prev) => [...prev, { ...ticket, status: "todo" }]);
    patchTicket(id, { status: "todo" });
  }

  function moveToBlocked(id: string) {
    const ticket = backlogTickets.find((t) => t._id === id);
    if (!ticket) return;
    setBacklogTickets((prev) => prev.filter((t) => t._id !== id));
    setBoardTickets((prev) => [...prev, { ...ticket, status: "blocked" }]);
    patchTicket(id, { status: "blocked" });
  }

  function moveToBacklog(id: string) {
    const ticket = boardTickets.find((t) => t._id === id);
    if (!ticket) return;
    setBoardTickets((prev) => prev.filter((t) => t._id !== id));
    setBacklogTickets((prev) => [...prev, { ...ticket, status: "backlog" }]);
    patchTicket(id, { status: "backlog" });
  }

  function toggleBlocked(id: string, blocked: boolean) {
    const status: TicketStatus = blocked ? "blocked" : "todo";
    setBoardTickets((prev) => prev.map((t) => (t._id === id ? { ...t, status } : t)));
    patchTicket(id, { status });
  }

  function togglePublic(id: string, isPublic: boolean, list: "backlog" | "board") {
    const setList = list === "backlog" ? setBacklogTickets : setBoardTickets;
    setList((prev) => prev.map((t) => (t._id === id ? { ...t, isPublic } : t)));
    patchTicket(id, { isPublic });
  }

  function promoteToTask(id: string, list: "backlog" | "board") {
    const setList = list === "backlog" ? setBacklogTickets : setBoardTickets;
    setList((prev) => prev.map((t) => (t._id === id ? { ...t, taskType: "Task" } : t)));
    patchTicket(id, { taskType: "Task" });
  }

  function handleDelete(id: string, key: string, list: "backlog" | "board") {
    if (!confirm(`Delete ${key}? This can't be undone.`)) return;
    const setList = list === "backlog" ? setBacklogTickets : setBoardTickets;
    setList((prev) => prev.filter((t) => t._id !== id));
    fetch(`/api/tickets/${id}`, { method: "DELETE" });
  }

  function ownersOf(ticket: TicketDTO) {
    return ticket.owners
      .map((id) => team.find((m) => m.discordId === id))
      .filter((m): m is TeamMember => Boolean(m));
  }

  function handleSaved(saved: TicketDTO) {
    // The modal can change status too — relocate the ticket between the
    // backlog/board columns (or drop it from both if it's now "done").
    setBacklogTickets((prev) => {
      const filtered = prev.filter((t) => t._id !== saved._id);
      return saved.status === "backlog" ? [...filtered, saved] : filtered;
    });
    setBoardTickets((prev) => {
      const filtered = prev.filter((t) => t._id !== saved._id);
      return saved.status !== "backlog" && saved.status !== "done"
        ? [...filtered, saved]
        : filtered;
    });
    setEditingTicket(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-6 py-6">
      <h1 className="text-xl font-semibold">Planning</h1>
      <p className="text-sm text-zinc-500">
        Go down each column and add, block, or otherwise update tickets. No sprint
        planning meeting required.
      </p>

      <div className="flex items-center justify-between gap-2">
        <TicketFilters
          values={filters}
          onChange={setFilters}
          team={team}
          labelOptions={labelOptions}
        />
        <NewTicketButton team={team} />
      </div>

      <div className="grid flex-1 grid-cols-2 gap-4">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Backlog · {visibleBacklog.length}
          </h2>
          {visibleBacklog.length === 0 && (
            <p className="text-sm text-zinc-500">Nothing here.</p>
          )}
          {visibleBacklog.map((ticket) => {
            const due = dueInfo(ticket.dueDate);
            const owners = ownersOf(ticket);
            return (
              <div
                key={ticket._id}
                onClick={() => setEditingTicket(ticket)}
                className="flex cursor-pointer flex-col gap-2 rounded border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-500">{ticket.key}</span>
                  {owners.length > 0 && (
                    <div className="flex -space-x-1.5">
                      {owners.map((member) => (
                        <MemberAvatar
                          key={member.discordId}
                          member={member}
                          className="h-5 w-5 ring-2 ring-white dark:ring-zinc-900"
                        />
                      ))}
                    </div>
                  )}
                  <span className="flex-1 truncate">{ticket.title}</span>
                  {ticket.description.trim() && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(ticket._id);
                      }}
                      aria-label="Toggle description"
                      className="shrink-0 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      {expanded.has(ticket._id) ? "▾" : "▸"}
                    </button>
                  )}
                  <span className="shrink-0 text-xs text-zinc-400">
                    {timeAgo(ticket.createdAt)}
                  </span>
                  {due && (
                    <span
                      className={`shrink-0 text-xs ${due.overdue ? "font-medium text-red-600 dark:text-red-400" : "text-zinc-400"}`}
                    >
                      {due.text}
                    </span>
                  )}
                </div>
                {expanded.has(ticket._id) && ticket.description.trim() && (
                  <p className="whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400">
                    {ticket.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => moveToBoard(ticket._id)}
                    className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
                  >
                    Add to board
                  </button>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => moveToBlocked(ticket._id)}
                    />
                    Blocked
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={ticket.isPublic}
                      onChange={(e) => togglePublic(ticket._id, e.target.checked, "backlog")}
                    />
                    Public
                  </label>
                  {ticket.taskType === "Idea" && (
                    <button
                      onClick={() => promoteToTask(ticket._id, "backlog")}
                      className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium dark:bg-zinc-800"
                    >
                      Promote to Task
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(ticket._id, ticket.key, "backlog")}
                    className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Board · {visibleBoard.length}
          </h2>
          {visibleBoard.length === 0 && (
            <p className="text-sm text-zinc-500">Nothing here.</p>
          )}
          {visibleBoard.map((ticket) => {
            const due = dueInfo(ticket.dueDate);
            const owners = ownersOf(ticket);
            return (
              <div
                key={ticket._id}
                onClick={() => setEditingTicket(ticket)}
                className="flex cursor-pointer flex-col gap-2 rounded border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-500">{ticket.key}</span>
                  {owners.length > 0 && (
                    <div className="flex -space-x-1.5">
                      {owners.map((member) => (
                        <MemberAvatar
                          key={member.discordId}
                          member={member}
                          className="h-5 w-5 ring-2 ring-white dark:ring-zinc-900"
                        />
                      ))}
                    </div>
                  )}
                  <span className="flex-1 truncate">{ticket.title}</span>
                  {ticket.description.trim() && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(ticket._id);
                      }}
                      aria-label="Toggle description"
                      className="shrink-0 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      {expanded.has(ticket._id) ? "▾" : "▸"}
                    </button>
                  )}
                  <span className="shrink-0 text-xs text-zinc-400">
                    {timeAgo(ticket.createdAt)}
                  </span>
                  {due && (
                    <span
                      className={`shrink-0 text-xs ${due.overdue ? "font-medium text-red-600 dark:text-red-400" : "text-zinc-400"}`}
                    >
                      {due.text}
                    </span>
                  )}
                  <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                    {STATUS_LABELS[ticket.status]}
                  </span>
                </div>
                {expanded.has(ticket._id) && ticket.description.trim() && (
                  <p className="whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400">
                    {ticket.description}
                  </p>
                )}
                <div
                  className="flex flex-wrap items-center gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => moveToBacklog(ticket._id)}
                    className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium dark:bg-zinc-800"
                  >
                    Move to backlog
                  </button>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={ticket.status === "blocked"}
                      onChange={(e) => toggleBlocked(ticket._id, e.target.checked)}
                    />
                    Blocked
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={ticket.isPublic}
                      onChange={(e) => togglePublic(ticket._id, e.target.checked, "board")}
                    />
                    Public
                  </label>
                  {ticket.taskType === "Idea" && (
                    <button
                      onClick={() => promoteToTask(ticket._id, "board")}
                      className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium dark:bg-zinc-800"
                    >
                      Promote to Task
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(ticket._id, ticket.key, "board")}
                    className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {editingTicket && (
        <TicketModal
          ticket={editingTicket}
          team={team}
          onClose={() => setEditingTicket(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
