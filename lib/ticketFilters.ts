import type { TicketDTO } from "@/lib/tickets";
import type { WorkType, TaskType } from "@/lib/models";

export interface TicketFilterValues {
  workType: WorkType | "all";
  taskType: TaskType | "all";
  owners: string[]; // discordIds; empty = no owner filter, otherwise OR-matched
  label: string; // label text, or "all"
  publicOnly: boolean;
  search: string; // matches against key + title, case-insensitive
}

export const ALL_TICKET_FILTERS: TicketFilterValues = {
  workType: "all",
  taskType: "all",
  owners: [],
  label: "all",
  publicOnly: false,
  search: "",
};

export function matchesTicketFilters(t: TicketDTO, f: TicketFilterValues): boolean {
  const query = f.search.trim().toLowerCase();
  return (
    (f.workType === "all" || t.workType === f.workType) &&
    (f.taskType === "all" || t.taskType === f.taskType) &&
    (f.owners.length === 0 || t.owners.some((id) => f.owners.includes(id))) &&
    (f.label === "all" || t.labels.includes(f.label)) &&
    (!f.publicOnly || t.isPublic) &&
    (query === "" ||
      t.key.toLowerCase().includes(query) ||
      t.title.toLowerCase().includes(query))
  );
}

/** Distinct labels across one or more ticket lists, sorted. */
export function collectLabels(...ticketLists: TicketDTO[][]): string[] {
  const set = new Set<string>();
  for (const list of ticketLists) {
    for (const t of list) {
      for (const l of t.labels) set.add(l);
    }
  }
  return Array.from(set).sort();
}
