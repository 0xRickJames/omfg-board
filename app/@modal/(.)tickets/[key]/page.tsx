import { notFound } from "next/navigation";
import { getTicketByKey, toTicketDTO } from "@/lib/tickets";
import { getTeamWithAvatars } from "@/lib/team";
import InterceptedTicketModal from "@/app/@modal/(.)tickets/[key]/InterceptedTicketModal";

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

  return <InterceptedTicketModal ticket={toTicketDTO(ticket)} team={team} />;
}
