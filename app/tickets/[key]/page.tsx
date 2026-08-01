import { notFound } from "next/navigation";
import { getTicketByKey, toTicketDTO } from "@/lib/tickets";
import { getTeamWithAvatars } from "@/lib/team";
import TicketPageClient from "@/app/tickets/[key]/TicketPageClient";

export default async function TicketPage({
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

  return <TicketPageClient ticket={toTicketDTO(ticket)} team={team} />;
}
