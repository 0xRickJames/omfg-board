import type { TicketDTO } from "@/lib/tickets";

export default function TicketCard({
  ticket,
  onDelete,
  actions,
}: {
  ticket: TicketDTO;
  onDelete: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs text-zinc-500">{ticket.key}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete ${ticket.key}? This can't be undone.`)) {
              onDelete();
            }
          }}
          className="text-xs text-zinc-400 hover:text-red-600"
          aria-label={`Delete ${ticket.key}`}
        >
          Delete
        </button>
      </div>
      <p className="font-medium">{ticket.title}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
          {ticket.workType}
        </span>
        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
          {ticket.taskType}
        </span>
        {ticket.priority !== "none" && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            {ticket.priority}
          </span>
        )}
      </div>
      {actions}
    </div>
  );
}
