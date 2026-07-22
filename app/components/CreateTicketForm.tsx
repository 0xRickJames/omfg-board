"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { WorkType, TaskType } from "@/lib/models";

const WORK_TYPES: WorkType[] = [
  "BD",
  "Marketing",
  "Design",
  "Frontend",
  "Backend",
  "Research",
];
const TASK_TYPES: TaskType[] = ["Idea", "Task", "Bug"];

export default function CreateTicketForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [workType, setWorkType] = useState<WorkType>(WORK_TYPES[0]);
  const [taskType, setTaskType] = useState<TaskType>(TASK_TYPES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, workType, taskType }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create ticket");
      return;
    }

    setTitle("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex flex-1 min-w-48 flex-col gap-1">
        <label className="text-xs font-medium text-zinc-500">Title</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-500">Work type</label>
        <select
          value={workType}
          onChange={(e) => setWorkType(e.target.value as WorkType)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {WORK_TYPES.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-500">Type</label>
        <select
          value={taskType}
          onChange={(e) => setTaskType(e.target.value as TaskType)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {TASK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {submitting ? "Adding…" : "Add ticket"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
