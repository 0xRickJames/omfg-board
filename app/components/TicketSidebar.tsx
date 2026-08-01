"use client";

import type { TicketDTO } from "@/lib/tickets";
import type { TeamMember } from "@/lib/team";
import TicketForm from "@/app/components/TicketForm";

/**
 * The slide-in panel used to view/edit an existing ticket from anywhere in
 * the app (Board/Backlog/Planning/List all navigate here via the
 * `(.)tickets/[key]` intercepting route rather than a centered modal —
 * TicketModal is reserved for creating new tickets).
 */
export default function TicketSidebar({
  ticket,
  team,
  onClose,
  onSaved,
}: {
  ticket: TicketDTO;
  team: TeamMember[];
  onClose: () => void;
  onSaved: (ticket: TicketDTO) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      {/* Deliberately no onClick-to-close on the backdrop — see TicketModal
          for why: an accidental outside click used to silently discard an
          in-progress edit. */}
      <div className="flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto bg-white p-6 shadow-xl dark:bg-zinc-900 sm:max-w-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{ticket.key}</h2>
          <div className="flex items-center gap-3">
            <a
              href={`/tickets/${ticket.key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              title="Open as a standalone page"
            >
              Open full page ↗
            </a>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ✕
            </button>
          </div>
        </div>

        <TicketForm ticket={ticket} team={team} onSaved={onSaved} onCancel={onClose} />
      </div>
    </div>
  );
}
