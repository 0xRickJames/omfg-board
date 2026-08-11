"use client";

import type { TicketDTO } from "@/lib/tickets";
import type { TeamMember } from "@/lib/team";
import TicketForm from "@/app/components/TicketForm";

export default function TicketModal({
  ticket,
  team,
  onClose,
  onSaved,
  defaultParentKey,
}: {
  ticket: TicketDTO | null;
  team: TeamMember[];
  onClose: () => void;
  onSaved: (ticket: TicketDTO) => void;
  defaultParentKey?: string;
}) {
  const mode = ticket ? "edit" : "create";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* Deliberately no onClick-to-close on the backdrop — an accidental
          click outside used to silently discard an in-progress edit.
          Closing now only happens via Cancel/✕ or a successful save. */}
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === "create" ? "New ticket" : ticket!.key}
          </h2>
          <div className="flex items-center gap-3">
            {mode === "edit" && (
              <a
                href={`/tickets/${ticket!.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                title="Open as a standalone page"
              >
                Open full page ↗
              </a>
            )}
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
              ✕
            </button>
          </div>
        </div>

        <TicketForm
          ticket={ticket}
          team={team}
          onSaved={onSaved}
          onCancel={onClose}
          defaultParentKey={defaultParentKey}
        />
      </div>
    </div>
  );
}
