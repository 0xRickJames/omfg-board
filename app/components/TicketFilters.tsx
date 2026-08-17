"use client";

import type { TaskType } from "@/lib/models";
import type { TeamMember } from "@/lib/team";
import { ALL_TICKET_FILTERS, type TicketFilterValues } from "@/lib/ticketFilters";
import WorkTypeFilter from "@/app/components/WorkTypeFilter";
import OwnerFilter from "@/app/components/OwnerFilter";
import TicketSearchInput from "@/app/components/TicketSearchInput";

const TASK_TYPES: TaskType[] = ["Idea", "Task", "Bug"];

const selectClass =
  "rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800";

export default function TicketFilters({
  values,
  onChange,
  team,
  labelOptions,
}: {
  values: TicketFilterValues;
  onChange: (values: TicketFilterValues) => void;
  team: TeamMember[];
  labelOptions: string[];
}) {
  const hasActiveFilter =
    values.workType !== "all" ||
    values.taskType !== "all" ||
    values.owners.length > 0 ||
    values.label !== "all" ||
    values.publicOnly ||
    values.search.trim() !== "";

  return (
    <div className="flex flex-wrap gap-2">
      <TicketSearchInput
        value={values.search}
        onChange={(search) => onChange({ ...values, search })}
      />
      <WorkTypeFilter
        value={values.workType}
        onChange={(workType) => onChange({ ...values, workType })}
      />
      <select
        value={values.taskType}
        onChange={(e) =>
          onChange({ ...values, taskType: e.target.value as TaskType | "all" })
        }
        className={selectClass}
      >
        <option value="all">All task types</option>
        {TASK_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <OwnerFilter
        value={values.owners}
        onChange={(owners) => onChange({ ...values, owners })}
        team={team}
      />
      {labelOptions.length > 0 && (
        <select
          value={values.label}
          onChange={(e) => onChange({ ...values, label: e.target.value })}
          className={selectClass}
        >
          <option value="all">All labels</option>
          {labelOptions.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      )}
      <label className="flex items-center gap-1.5 rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700">
        <input
          type="checkbox"
          checked={values.publicOnly}
          onChange={(e) => onChange({ ...values, publicOnly: e.target.checked })}
        />
        Public only
      </label>
      {hasActiveFilter && (
        <button
          type="button"
          onClick={() => onChange(ALL_TICKET_FILTERS)}
          className="text-xs text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
