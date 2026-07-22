import { auth } from "@/auth";
import { listTickets, toTicketDTO } from "@/lib/tickets";
import BoardClient from "@/app/components/BoardClient";

export default async function BoardPage() {
  const session = await auth();
  const [todo, inProgress, testing, done] = await Promise.all([
    listTickets({ status: "todo" }),
    listTickets({ status: "in_progress" }),
    listTickets({ status: "testing" }),
    listTickets({ status: "done" }),
  ]);

  const tickets = [...todo, ...inProgress, ...testing, ...done].map(toTicketDTO);

  return (
    <BoardClient initialTickets={tickets} currentUserDiscordId={session!.user.discordId} />
  );
}
