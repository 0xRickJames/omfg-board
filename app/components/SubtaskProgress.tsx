export default function SubtaskProgress({
  done,
  total,
}: {
  done: number;
  total: number;
}) {
  if (total === 0) return null;
  const pct = (done / total) * 100;

  return (
    <div
      className="flex shrink-0 items-center gap-1.5"
      title={`${done}/${total} subtasks done`}
    >
      <div className="h-1.5 w-10 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-zinc-900 dark:bg-zinc-50"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400">
        {done}/{total}
      </span>
    </div>
  );
}
