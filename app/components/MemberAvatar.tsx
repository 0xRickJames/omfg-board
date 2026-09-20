"use client";

import { useState } from "react";
import type { TeamMember } from "@/lib/team";

export default function MemberAvatar({
  member,
  className = "h-5 w-5",
}: {
  member: TeamMember;
  className?: string;
}) {
  // Discord avatar URLs are hash-based — if someone changes their pfp and
  // hasn't logged back in since (upsertUserFromDiscord only refreshes it on
  // sign-in), the stored URL 404s. Fall back to initials instead of the
  // browser's broken-image icon.
  const [broken, setBroken] = useState(false);

  return member.avatar && !broken ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={member.avatar}
      alt={member.name}
      title={member.name}
      className={`rounded-full ${className}`}
      onError={() => setBroken(true)}
    />
  ) : (
    <span
      title={member.name}
      className={`flex items-center justify-center rounded-full bg-zinc-400 text-[10px] text-white ${className}`}
    >
      {member.name[0]}
    </span>
  );
}
