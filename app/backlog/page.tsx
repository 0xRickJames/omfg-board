import { listTickets, toTicketDTO } from "@/lib/tickets";
import { getTeamWithAvatars } from "@/lib/team";
import BacklogClient from "@/app/components/BacklogClient";

export default async function BacklogPage() {
  const [tickets, team] = await Promise.all([
    listTickets({ status: "backlog" }),
    getTeamWithAvatars(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
      <h1 className="text-xl font-semibold">Backlog</h1>
      <BacklogClient initialTickets={tickets.map(toTicketDTO)} team={team} />
    </div>
  );
}
