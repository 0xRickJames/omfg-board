import { auth } from "@/auth";
import { listTickets, toTicketDTO } from "@/lib/tickets";
import { getTeamWithAvatars } from "@/lib/team";
import PlanningClient from "@/app/components/PlanningClient";

export default async function PlanningPage() {
  const session = await auth();

  if (session?.user.role !== "founder") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-6 py-6">
        <p className="text-sm text-zinc-500">This page is for founders only.</p>
      </div>
    );
  }

  const [allTickets, team] = await Promise.all([listTickets({}), getTeamWithAvatars()]);

  const backlogTickets = allTickets.filter((t) => t.status === "backlog").map(toTicketDTO);
  const boardTickets = allTickets
    .filter((t) => t.status !== "backlog" && t.status !== "done")
    .map(toTicketDTO);

  return (
    <PlanningClient
      initialBacklogTickets={backlogTickets}
      initialBoardTickets={boardTickets}
      team={team}
    />
  );
}
