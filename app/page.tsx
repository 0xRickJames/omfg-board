import { auth } from "@/auth";
import { listTickets } from "@/lib/tickets";
import CreateTicketForm from "@/app/components/CreateTicketForm";
import SignOutButton from "@/app/components/SignOutButton";

export default async function Home() {
  const session = await auth();
  const tickets = await listTickets();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">OMFGBoard</h1>
          <p className="text-sm text-zinc-500">
            Signed in as {session?.user?.name} ({session?.user?.role})
          </p>
        </div>
        <SignOutButton />
      </header>

      <CreateTicketForm />

      <ul className="flex flex-col gap-2">
        {tickets.map((ticket) => (
          <li
            key={ticket.key}
            className="flex items-center gap-3 rounded border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
          >
            <span className="font-mono text-xs text-zinc-500">
              {ticket.key}
            </span>
            <span className="flex-1">{ticket.title}</span>
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
              {ticket.workType}
            </span>
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
              {ticket.taskType}
            </span>
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
              {ticket.status}
            </span>
          </li>
        ))}
        {tickets.length === 0 && (
          <p className="text-sm text-zinc-500">No tickets yet.</p>
        )}
      </ul>
    </div>
  );
}
