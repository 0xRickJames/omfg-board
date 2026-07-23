"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamMember } from "@/lib/team";
import TicketModal from "@/app/components/TicketModal";

export default function NewTicketButton({ team }: { team: TeamMember[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        + New ticket
      </button>
      {open && (
        <TicketModal
          ticket={null}
          team={team}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
