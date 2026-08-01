"use client";

import { useRouter } from "next/navigation";
import type { TicketDTO } from "@/lib/tickets";
import type { TeamMember } from "@/lib/team";
import TicketSidebar from "@/app/components/TicketSidebar";

export default function InterceptedTicketSidebar({
  ticket,
  team,
}: {
  ticket: TicketDTO;
  team: TeamMember[];
}) {
  const router = useRouter();

  return (
    <TicketSidebar
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
