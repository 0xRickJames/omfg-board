"use client";

import type { WorkType } from "@/lib/models";

const WORK_TYPES: WorkType[] = [
  "BD",
  "Marketing",
  "Design",
  "Frontend",
  "Backend",
  "Research",
  "Ops",
  "none",
];

export default function WorkTypeFilter({
  value,
  onChange,
}: {
  value: WorkType | "all";
  onChange: (value: WorkType | "all") => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as WorkType | "all")}
      className="rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
    >
      <option value="all">All work types</option>
      {WORK_TYPES.map((w) => (
        <option key={w} value={w}>
          {w === "none" ? "None" : w}
        </option>
      ))}
    </select>
  );
}
