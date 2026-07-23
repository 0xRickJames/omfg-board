import type { TicketDTO } from "@/lib/tickets";
import type { TeamMember } from "@/lib/team";
import { timeAgo, dueInfo } from "@/lib/format";
import MemberAvatar from "@/app/components/MemberAvatar";

export default function TicketCard({
  ticket,
  team,
  onDelete,
  onOpen,
  actions,
}: {
  ticket: TicketDTO;
  team: TeamMember[];
  onDelete: () => void;
  onOpen?: () => void;
  actions?: React.ReactNode;
}) {
  const due = dueInfo(ticket.dueDate);
  const owners = ticket.owners
    .map((id) => team.find((m) => m.discordId === id))
    .filter((m): m is TeamMember => Boolean(m));

  return (
    <div
      onClick={onOpen}
      className={`flex flex-col gap-2 rounded border border-zinc-200 bg-white p-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${
        onOpen ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
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
        </div>
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
        {ticket.workType !== "none" && (
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
            {ticket.workType}
          </span>
        )}
        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
          {ticket.taskType}
        </span>
        {ticket.priority !== "none" && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            {ticket.priority}
          </span>
        )}
        <span className="ml-auto text-xs text-zinc-400" title="Time since created">
          {timeAgo(ticket.createdAt)}
        </span>
      </div>
      {due && (
        <span
          className={`text-xs ${due.overdue ? "font-medium text-red-600 dark:text-red-400" : "text-zinc-400"}`}
        >
          {due.text}
        </span>
      )}
      {actions}
    </div>
  );
}
