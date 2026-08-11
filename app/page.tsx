import { listTickets, toTicketDTO, getSubtaskCounts } from "@/lib/tickets";
import { getTeamWithAvatars } from "@/lib/team";
import { listCurrentOutOfOffice } from "@/lib/googleCalendar";
import BoardClient from "@/app/components/BoardClient";
import OutOfOfficeBanner from "@/app/components/OutOfOfficeBanner";

const WEEK_MS = 1000 * 60 * 60 * 24 * 7;

export default async function BoardPage() {
  const [todo, blocked, inProgress, testing, done, team, outOfOffice] = await Promise.all([
    listTickets({ status: "todo" }),
    listTickets({ status: "blocked" }),
    listTickets({ status: "in_progress" }),
    listTickets({ status: "testing" }),
    listTickets({ status: "done" }),
    getTeamWithAvatars(),
    listCurrentOutOfOffice(),
  ]);

  // Done tickets fall off the Board a week after they were completed —
  // still there in /list, just not cluttering the active view. This is a
  // Server Component that runs fresh per request, not a client re-render,
  // so Date.now() here isn't the staleness hazard the lint rule targets.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const recentlyDone = done.filter((t) => t.doneAt && now - t.doneAt.getTime() < WEEK_MS);

  const tickets = [...todo, ...blocked, ...inProgress, ...testing, ...recentlyDone].map(
    toTicketDTO,
  );
  const progress = await getSubtaskCounts(tickets.map((t) => t.key));

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pt-4 sm:px-6">
        <OutOfOfficeBanner entries={outOfOffice} />
      </div>
      <BoardClient initialTickets={tickets} team={team} progress={progress} />
    </div>
  );
}
