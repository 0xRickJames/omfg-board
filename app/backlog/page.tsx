import { auth } from "@/auth";
import { listTickets, toTicketDTO } from "@/lib/tickets";
import BacklogClient from "@/app/components/BacklogClient";

export default async function BacklogPage() {
  const session = await auth();
  const tickets = await listTickets({ status: "backlog" });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
      <h1 className="text-xl font-semibold">Backlog</h1>
      <BacklogClient
        initialTickets={tickets.map(toTicketDTO)}
        currentUserDiscordId={session!.user.discordId}
      />
    </div>
  );
}
