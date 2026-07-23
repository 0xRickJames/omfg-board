import { listTickets, toTicketDTO } from "@/lib/tickets";
import { getTeamWithAvatars } from "@/lib/team";
import ListClient from "@/app/components/ListClient";

export default async function ListPage() {
  const [tickets, team] = await Promise.all([listTickets({}), getTeamWithAvatars()]);

  return <ListClient initialTickets={tickets.map(toTicketDTO)} team={team} />;
}
