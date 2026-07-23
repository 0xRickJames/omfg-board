import type { TicketDTO } from "@/lib/tickets";
import type { WorkType, TaskType } from "@/lib/models";

export interface TicketFilterValues {
  workType: WorkType | "all";
  taskType: TaskType | "all";
  owner: string; // discordId, or "all"
  label: string; // label text, or "all"
}

export const ALL_TICKET_FILTERS: TicketFilterValues = {
  workType: "all",
  taskType: "all",
  owner: "all",
  label: "all",
};

export function matchesTicketFilters(t: TicketDTO, f: TicketFilterValues): boolean {
  return (
    (f.workType === "all" || t.workType === f.workType) &&
    (f.taskType === "all" || t.taskType === f.taskType) &&
    (f.owner === "all" || t.owners.includes(f.owner)) &&
    (f.label === "all" || t.labels.includes(f.label))
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
