import { notFound } from "next/navigation";
import { getTicketByKey, toTicketDTO } from "@/lib/tickets";
import { getTeamWithAvatars } from "@/lib/team";
import InterceptedTicketSidebar from "@/app/@modal/(.)tickets/[key]/InterceptedTicketSidebar";

export default async function InterceptedTicketPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const [ticket, team] = await Promise.all([
    getTicketByKey(key.toUpperCase()),
    getTeamWithAvatars(),
  ]);

  if (!ticket) notFound();

  return <InterceptedTicketSidebar ticket={toTicketDTO(ticket)} team={team} />;
}
