"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TicketDTO, SubtaskCounts } from "@/lib/tickets";
import { STATUS_LABELS, type Priority } from "@/lib/models";
import type { TeamMember } from "@/lib/team";
import { timeAgo, dueInfo, keyNumber } from "@/lib/format";
import {
  matchesTicketFilters,
  collectLabels,
  type TicketFilterValues,
} from "@/lib/ticketFilters";
import { filtersFromSearchParams, filtersToSearchParams } from "@/lib/filterUrl";
import TicketFilters from "@/app/components/TicketFilters";
import MemberAvatar from "@/app/components/MemberAvatar";
import NewTicketButton from "@/app/components/NewTicketButton";
import SubtaskProgress from "@/app/components/SubtaskProgress";

type SortField =
  | "key"
  | "title"
  | "workType"
  | "taskType"
  | "status"
  | "priority"
  | "dueDate"
  | "createdAt";
type SortDirection = "asc" | "desc";

const PRIORITY_RANK: Record<Priority, number> = {
  none: 0,
  low: 1,
  med: 2,
  high: 3,
  urgent: 4,
};
const STATUS_RANK: Record<string, number> = {
  backlog: 0,
  todo: 1,
  blocked: 2,
  in_progress: 3,
  testing: 4,
  done: 5,
};

function compare(a: TicketDTO, b: TicketDTO, field: SortField): number {
  switch (field) {
    case "key":
      return keyNumber(a.key) - keyNumber(b.key);
    case "priority":
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    case "status":
      return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    case "dueDate":
      if (a.dueDate === b.dueDate) return 0;
      if (a.dueDate === null) return 1; // nulls sort last regardless of direction
      if (b.dueDate === null) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    case "createdAt":
      return a.createdAt.localeCompare(b.createdAt);
    default:
      return String(a[field]).localeCompare(String(b[field]));
  }
}

const COLUMNS: { field: SortField; label: string }[] = [
  { field: "key", label: "Key" },
  { field: "title", label: "Title" },
  { field: "workType", label: "Work Type" },
  { field: "taskType", label: "Type" },
  { field: "status", label: "Status" },
  { field: "priority", label: "Priority" },
  { field: "dueDate", label: "Due" },
  { field: "createdAt", label: "Created" },
];

export default function ListClient({
  initialTickets,
  team,
  progress,
}: {
  initialTickets: TicketDTO[];
  team: TeamMember[];
  progress: Record<string, SubtaskCounts>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState(initialTickets);
  const [prevInitialTickets, setPrevInitialTickets] = useState(initialTickets);
  const [filters, setFilters] = useState<TicketFilterValues>(() =>
    filtersFromSearchParams(searchParams),
  );
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  function handleFiltersChange(next: TicketFilterValues) {
    setFilters(next);
    const qs = filtersToSearchParams(next).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // initialTickets comes from a fresh server fetch on every router.refresh()
  // (e.g. after creating a ticket) — resync local state when it changes.
  if (initialTickets !== prevInitialTickets) {
    setPrevInitialTickets(initialTickets);
    setTickets(initialTickets);
  }

  const labelOptions = useMemo(() => collectLabels(tickets), [tickets]);

  const visible = useMemo(() => {
    const filtered = tickets.filter((t) => matchesTicketFilters(t, filters));
    const sorted = [...filtered].sort((a, b) => {
      const cmp = compare(a, b, sortField);
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [tickets, filters, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function handleDelete(id: string, key: string) {
    if (!confirm(`Delete ${key}? This can't be undone.`)) return;
    setTickets((prev) => prev.filter((t) => t._id !== id));
    fetch(`/api/tickets/${id}`, { method: "DELETE" });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <h1 className="text-xl font-semibold">All Tickets</h1>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TicketFilters
          values={filters}
          onChange={handleFiltersChange}
          team={team}
          labelOptions={labelOptions}
        />
        <NewTicketButton team={team} />
      </div>

      <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.field} className="px-3 py-2">
                  <button
                    onClick={() => handleSort(col.field)}
                    className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    {col.label}
                    {sortField === col.field && (sortDirection === "asc" ? "▲" : "▼")}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2">Owners</th>
              <th className="px-3 py-2">Subtasks</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {visible.map((ticket) => {
              const due = dueInfo(ticket.dueDate, ticket.status);
              const owners = ticket.owners
                .map((id) => team.find((m) => m.discordId === id))
                .filter((m): m is TeamMember => Boolean(m));
              return (
                <tr
                  key={ticket._id}
                  onClick={() => router.push(`/tickets/${ticket.key}`)}
                  className="cursor-pointer border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
                >
                  <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                    <Link
                      href={`/tickets/${ticket.key}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline"
                    >
                      {ticket.key}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-3 py-2">{ticket.title}</td>
                  <td className="px-3 py-2">{ticket.workType === "none" ? "—" : ticket.workType}</td>
                  <td className="px-3 py-2">{ticket.taskType}</td>
                  <td className="px-3 py-2">{STATUS_LABELS[ticket.status]}</td>
                  <td className="px-3 py-2">{ticket.priority === "none" ? "—" : ticket.priority}</td>
                  <td className="px-3 py-2">
                    {due ? (
                      <span className={due.overdue ? "font-medium text-red-600 dark:text-red-400" : ""}>
                        {due.text}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-500" title={ticket.createdAt}>
                    {timeAgo(ticket.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex -space-x-1.5">
                      {owners.map((member) => (
                        <MemberAvatar key={member.discordId} member={member} className="h-5 w-5 ring-2 ring-white dark:ring-zinc-900" />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {progress[ticket.key] && (
                      <SubtaskProgress
                        done={progress[ticket.key].done}
                        total={progress[ticket.key].total}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(ticket._id, ticket.key);
                      }}
                      className="text-xs text-zinc-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="p-4 text-sm text-zinc-500">Nothing matches these filters.</p>
        )}
      </div>
    </div>
  );
}
