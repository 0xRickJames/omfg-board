import type { TeamMember } from "@/lib/team";

export default function MemberAvatar({
  member,
  className = "h-5 w-5",
}: {
  member: TeamMember;
  className?: string;
}) {
  return member.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={member.avatar} alt={member.name} title={member.name} className={`rounded-full ${className}`} />
  ) : (
    <span
      title={member.name}
      className={`flex items-center justify-center rounded-full bg-zinc-400 text-[10px] text-white ${className}`}
    >
      {member.name[0]}
    </span>
  );
}
