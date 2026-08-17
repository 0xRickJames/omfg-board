import { ALL_TICKET_FILTERS, type TicketFilterValues } from "@/lib/ticketFilters";
import type { WorkType, TaskType } from "@/lib/models";

/** Reads filter state out of the current URL's query string, so a filtered
 *  view (e.g. one owner, public-only) can be shared as a plain link. */
export function filtersFromSearchParams(
  params: URLSearchParams | { get(key: string): string | null },
): TicketFilterValues {
  const owners = params.get("owners");
  return {
    workType: (params.get("workType") as WorkType | "all" | null) ?? ALL_TICKET_FILTERS.workType,
    taskType: (params.get("taskType") as TaskType | "all" | null) ?? ALL_TICKET_FILTERS.taskType,
    owners: owners ? owners.split(",").filter(Boolean) : [],
    label: params.get("label") ?? ALL_TICKET_FILTERS.label,
    publicOnly: params.get("publicOnly") === "1",
    search: params.get("q") ?? ALL_TICKET_FILTERS.search,
  };
}

/** Inverse of filtersFromSearchParams — omits anything at its default so an
 *  unfiltered view keeps a clean URL with no query string at all. */
export function filtersToSearchParams(filters: TicketFilterValues): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.workType !== "all") params.set("workType", filters.workType);
  if (filters.taskType !== "all") params.set("taskType", filters.taskType);
  if (filters.owners.length > 0) params.set("owners", filters.owners.join(","));
  if (filters.label !== "all") params.set("label", filters.label);
  if (filters.publicOnly) params.set("publicOnly", "1");
  if (filters.search.trim()) params.set("q", filters.search.trim());
  return params;
}
