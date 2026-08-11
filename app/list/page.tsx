import { listTickets, toTicketDTO, getSubtaskCounts } from "@/lib/tickets";
import { getTeamWithAvatars } from "@/lib/team";
import ListClient from "@/app/components/ListClient";

export default async function ListPage() {
  const [tickets, team] = await Promise.all([listTickets({}), getTeamWithAvatars()]);
  const ticketDTOs = tickets.map(toTicketDTO);
  const progress = await getSubtaskCounts(ticketDTOs.map((t) => t.key));

  return <ListClient initialTickets={ticketDTOs} team={team} progress={progress} />;
}
