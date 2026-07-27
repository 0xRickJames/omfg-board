import Link from "next/link";
import type { Session } from "next-auth";
import SignOutButton from "@/app/components/SignOutButton";
import ThemeToggle from "@/app/components/ThemeToggle";

export default function Nav({ session }: { session: Session | null }) {
  return (
    <header className="flex flex-col gap-2 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-zinc-800">
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
        <span className="font-semibold">OMFGBoard</span>
        <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          Board
        </Link>
        <Link href="/backlog" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          Backlog
        </Link>
        <Link href="/list" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          List
        </Link>
        {(session?.user?.role === "founder" || session?.user?.role === "planner") && (
          <Link href="/planning" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            Planning
          </Link>
        )}
      </nav>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
        {session?.user && (
          <span className="truncate">
            {session.user.name} ({session.user.role})
          </span>
        )}
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  );
}
