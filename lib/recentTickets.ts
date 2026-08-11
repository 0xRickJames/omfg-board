const STORAGE_KEY = "omfgboard:recentTickets";
const MAX_ENTRIES = 20;

/** Per-browser "recently viewed" ticket keys, most recent first — used to sort the parent-ticket dropdown. */
export function getRecentTicketKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordTicketViewed(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const rest = getRecentTicketKeys().filter((k) => k !== key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([key, ...rest].slice(0, MAX_ENTRIES)));
  } catch {
    // localStorage can be unavailable (privacy mode, quota) — not critical, skip silently.
  }
}
