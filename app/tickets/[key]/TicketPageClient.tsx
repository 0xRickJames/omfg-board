"use client";

import { useRouter } from "next/navigation";
import type { TicketDTO } from "@/lib/tickets";
import type { TeamMember } from "@/lib/team";
import TicketForm from "@/app/components/TicketForm";

export default function TicketPageClient({
  ticket,
  team,
}: {
  ticket: TicketDTO;
  team: TeamMember[];
}) {
  const router = useRouter();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{ticket.key}</h1>
        <button
          onClick={() => router.back()}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Back
        </button>
      </div>

      <TicketForm
        ticket={ticket}
        team={team}
        onSaved={() => router.refresh()}
        onCancel={() => router.back()}
      />
    </div>
  );
}
