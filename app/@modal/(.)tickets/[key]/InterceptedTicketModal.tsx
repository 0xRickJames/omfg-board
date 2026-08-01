"use client";

import { useRouter } from "next/navigation";
import type { TicketDTO } from "@/lib/tickets";
import type { TeamMember } from "@/lib/team";
import TicketModal from "@/app/components/TicketModal";

export default function InterceptedTicketModal({
  ticket,
  team,
}: {
  ticket: TicketDTO;
  team: TeamMember[];
}) {
  const router = useRouter();

  return (
    <TicketModal
      ticket={ticket}
      team={team}
      onClose={() => router.back()}
      onSaved={() => {
        router.refresh();
        router.back();
      }}
    />
  );
}
