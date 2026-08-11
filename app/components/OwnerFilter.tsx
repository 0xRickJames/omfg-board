"use client";

import { useEffect, useRef, useState } from "react";
import type { TeamMember } from "@/lib/team";

export default function OwnerFilter({
  value,
  onChange,
  team,
}: {
  value: string[];
  onChange: (owners: string[]) => void;
  team: TeamMember[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle(discordId: string) {
    onChange(
      value.includes(discordId)
        ? value.filter((id) => id !== discordId)
        : [...value, discordId],
    );
  }

  const label =
    value.length === 0
      ? "All owners"
      : value.length === 1
        ? team.find((m) => m.discordId === value[0])?.name ?? "1 owner"
        : `${value.length} owners`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800"
      >
        {label} ▾
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 flex min-w-36 flex-col gap-0.5 rounded border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          {team.map((member) => (
            <label
              key={member.discordId}
              className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              <input
                type="checkbox"
                checked={value.includes(member.discordId)}
                onChange={() => toggle(member.discordId)}
              />
              {member.name}
            </label>
          ))}
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded px-2 py-1 text-left text-xs text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
