"use client";

import type { WorkType } from "@/lib/models";

const WORK_TYPES: WorkType[] = [
  "BD",
  "Marketing",
  "Design",
  "Frontend",
  "Backend",
  "Research",
];

export default function WorkTypeFilter({
  value,
  onChange,
}: {
  value: WorkType | "all";
  onChange: (value: WorkType | "all") => void;
}) {
  const options: (WorkType | "all")[] = ["all", ...WORK_TYPES];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value === option
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          }`}
        >
          {option === "all" ? "All" : option}
        </button>
      ))}
    </div>
  );
}
