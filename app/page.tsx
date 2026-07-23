import { listTickets, toTicketDTO } from "@/lib/tickets";
import { getTeamWithAvatars } from "@/lib/team";
import BoardClient from "@/app/components/BoardClient";

export default async function BoardPage() {
  const [todo, blocked, inProgress, testing, done, team] = await Promise.all([
    listTickets({ status: "todo" }),
    listTickets({ status: "blocked" }),
    listTickets({ status: "in_progress" }),
    listTickets({ status: "testing" }),
    listTickets({ status: "done" }),
    getTeamWithAvatars(),
  ]);

  const tickets = [...todo, ...blocked, ...inProgress, ...testing, ...done].map(
    toTicketDTO,
  );

  return <BoardClient initialTickets={tickets} team={team} />;
}
