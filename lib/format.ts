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

/** "Due in 3d" / "Due today" / "Overdue by 2d", or null if there's no due date. */
export function dueInfo(dueDate: string | null, now: number = Date.now()): DueInfo | null {
  if (!dueDate) return null;
  const due = new Date(dueDate).getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((due - now) / dayMs);

  if (diffDays < 0) {
    return { text: `Overdue by ${Math.abs(diffDays)}d`, overdue: true };
  }
  if (diffDays === 0) {
    return { text: "Due today", overdue: false };
  }
  return { text: `Due in ${diffDays}d`, overdue: false };
}
