"use client";

import { useMemo, useState } from "react";
import type { TicketDTO } from "@/lib/tickets";
import type { TeamMember } from "@/lib/team";
import {
  ALL_TICKET_FILTERS,
  matchesTicketFilters,
  collectLabels,
  type TicketFilterValues,
} from "@/lib/ticketFilters";
import TicketCard from "@/app/components/TicketCard";
import TicketFilters from "@/app/components/TicketFilters";
import TicketModal from "@/app/components/TicketModal";

export default function BacklogClient({
  initialTickets,
  team,
}: {
  initialTickets: TicketDTO[];
  team: TeamMember[];
}) {
  const [tickets, setTickets] = useState<TicketDTO[]>(initialTickets);
  const [prevInitialTickets, setPrevInitialTickets] = useState(initialTickets);
  const [filters, setFilters] = useState<TicketFilterValues>(ALL_TICKET_FILTERS);
  const [editingTicket, setEditingTicket] = useState<TicketDTO | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // initialTickets comes from a fresh server fetch on every router.refresh()
  // (e.g. after creating a ticket) — resync local state when it changes.
  if (initialTickets !== prevInitialTickets) {
    setPrevInitialTickets(initialTickets);
    setTickets(initialTickets);
  }

  const labelOptions = useMemo(() => collectLabels(tickets), [tickets]);

  const visible = useMemo(
    () => tickets.filter((t) => matchesTicketFilters(t, filters)),
    [tickets, filters],
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

  function openCreate() {
    setEditingTicket(null);
    setModalOpen(true);
  }

  function openEdit(ticket: TicketDTO) {
    setEditingTicket(ticket);
    setModalOpen(true);
  }

  function handleSaved(saved: TicketDTO) {
    setTickets((prev) => {
      const filtered = prev.filter((t) => t._id !== saved._id);
      // The modal can change status too — only keep it here if it's still backlog.
      return saved.status === "backlog" ? [...filtered, saved] : filtered;
    });
    setModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <TicketFilters
          values={filters}
          onChange={setFilters}
          team={team}
          labelOptions={labelOptions}
        />
        <button
          onClick={openCreate}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          + New ticket
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {visible.map((ticket) => (
          <li key={ticket._id}>
            <TicketCard
              ticket={ticket}
              onDelete={() => handleDelete(ticket._id)}
              onOpen={() => openEdit(ticket)}
              actions={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveToBoard(ticket._id);
                  }}
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
      {modalOpen && (
        <TicketModal
          ticket={editingTicket}
          team={team}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
