import type { OutOfOfficeEntry } from "@/lib/googleCalendar";

function formatBackDate(endIso: string): string {
  return new Date(endIso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function OutOfOfficeBanner({ entries }: { entries: OutOfOfficeEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-4 py-2 text-sm dark:bg-amber-950/40">
      <span className="font-medium text-amber-800 dark:text-amber-200">Out of office:</span>
      {entries.map((entry) => (
        <span
          key={entry.discordId}
          className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200"
          title={entry.summary}
        >
          {entry.name} · back {formatBackDate(entry.end)}
        </span>
      ))}
    </div>
  );
}
