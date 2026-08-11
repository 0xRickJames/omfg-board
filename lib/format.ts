import type { TicketStatus } from "@/lib/models";

/** Numeric portion of a ticket key ("OMFG-42" -> 42), for sorting by newest/oldest. */
export function keyNumber(key: string): number {
  const match = key.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 1000 * 60 * 60 * 24 * 365],
  ["month", 1000 * 60 * 60 * 24 * 30],
  ["week", 1000 * 60 * 60 * 24 * 7],
  ["day", 1000 * 60 * 60 * 24],
  ["hour", 1000 * 60 * 60],
  ["minute", 1000 * 60],
];

const rtf = new Intl.RelativeTimeFormat("en", { style: "narrow" });

/** "3d ago", "2mo ago", "just now" — how long ago a date was, relative to now. */
export function timeAgo(date: string | Date, now: number = Date.now()): string {
  const diffMs = now - new Date(date).getTime();
  for (const [unit, ms] of UNITS) {
    const value = Math.floor(diffMs / ms);
    if (value >= 1) return rtf.format(-value, unit);
  }
  return "just now";
}

export interface DueInfo {
  text: string;
  overdue: boolean;
}

/**
 * "Due in 3d" / "Due today" / "Overdue by 2d", or null if there's no due
 * date — or the ticket is done. A done ticket can't be overdue.
 */
export function dueInfo(
  dueDate: string | null,
  status: TicketStatus,
  now: number = Date.now(),
): DueInfo | null {
  if (!dueDate || status === "done") return null;

  // dueDate is a plain "YYYY-MM-DD" string with no time/zone component.
  // Compare calendar days in the viewer's own local timezone rather than
  // raw timestamps — `new Date("YYYY-MM-DD")` parses as UTC midnight, which
  // drifts a day off from "now" for anyone behind UTC (a ticket due
  // "tomorrow" could read as overdue once it's evening locally).
  const [year, month, day] = dueDate.split("-").map(Number);
  const due = new Date(year, month - 1, day); // local midnight on the due date

  const today = new Date(now);
  today.setHours(0, 0, 0, 0); // local midnight today

  const dayMs = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((due.getTime() - today.getTime()) / dayMs);

  if (diffDays < 0) {
    return { text: `Overdue by ${Math.abs(diffDays)}d`, overdue: true };
  }
  if (diffDays === 0) {
    return { text: "Due today", overdue: false };
  }
  return { text: `Due in ${diffDays}d`, overdue: false };
}
