"use client";

import { useMemo, useState } from "react";
import type { TicketDTO } from "@/lib/tickets";
import type { WorkType } from "@/lib/models";
import TicketCard from "@/app/components/TicketCard";
import WorkTypeFilter from "@/app/components/WorkTypeFilter";

export default function BacklogClient({
  initialTickets,
}: {
  initialTickets: TicketDTO[];
}) {
  const [tickets, setTickets] = useState<TicketDTO[]>(initialTickets);
  const [prevInitialTickets, setPrevInitialTickets] = useState(initialTickets);
  const [workType, setWorkType] = useState<WorkType | "all">("all");

  // initialTickets comes from a fresh server fetch on every router.refresh()
  // (e.g. after creating a ticket) — resync local state when it changes.
  if (initialTickets !== prevInitialTickets) {
    setPrevInitialTickets(initialTickets);
    setTickets(initialTickets);
  }

  const visible = useMemo(
    () => (workType === "all" ? tickets : tickets.filter((t) => t.workType === workType)),
    [tickets, workType],
  );

  function handleDelete(id: string) {
    setTickets((prev) => prev.filter((t) => t._id !== id));
    fetch(`/api/tickets/${id}`, { method: "DELETE" });
  }

  function handleMoveToBoard(id: string) {
    setTickets((prev) => prev.filter((t) => t._id !== id));
    fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      // No order given — the server appends it to the end of the column.
      body: JSON.stringify({ status: "todo" }),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <WorkTypeFilter value={workType} onChange={setWorkType} />
      <ul className="flex flex-col gap-2">
        {visible.map((ticket) => (
          <li key={ticket._id}>
            <TicketCard
              ticket={ticket}
              onDelete={() => handleDelete(ticket._id)}
              actions={
                <button
                  onClick={() => handleMoveToBoard(ticket._id)}
                  className="self-start rounded bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
                >
                  Move to board
                </button>
              }
            />
          </li>
        ))}
        {visible.length === 0 && (
          <p className="text-sm text-zinc-500">Nothing in the backlog.</p>
        )}
      </ul>
    </div>
  );
}
