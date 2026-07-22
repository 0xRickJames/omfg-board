import Link from "next/link";
import type { Session } from "next-auth";
import SignOutButton from "@/app/components/SignOutButton";

export default function Nav({ session }: { session: Session | null }) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
      <nav className="flex items-center gap-4 text-sm font-medium">
        <span className="font-semibold">OMFGBoard</span>
        <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          Board
        </Link>
        <Link href="/backlog" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          Backlog
        </Link>
      </nav>
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        {session?.user && (
          <span>
            {session.user.name} ({session.user.role})
          </span>
        )}
        <SignOutButton />
      </div>
    </header>
  );
}
