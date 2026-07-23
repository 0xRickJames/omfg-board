import "server-only";
import { getDb } from "@/lib/mongodb";
import type { User } from "@/lib/models";

export const TEAM_ROSTER = [
  { discordId: "267142718856101889", name: "Rick" },
  { discordId: "1353331899111837757", name: "Rakka" },
  { discordId: "967378400257933312", name: "Haz" },
  { discordId: "1237545047260528641", name: "Ivan" },
  { discordId: "236508020341866497", name: "Zee" },
] as const;

export interface TeamMember {
  discordId: string;
  name: string;
  avatar: string | null;
}

/** Roster with each person's Discord avatar, once they've logged in at least once. */
export async function getTeamWithAvatars(): Promise<TeamMember[]> {
  const db = await getDb();
  const users = await db
    .collection<User>("users")
    .find({ discordId: { $in: TEAM_ROSTER.map((m) => m.discordId) } })
    .toArray();
  const byId = new Map(users.map((u) => [u.discordId, u]));

  return TEAM_ROSTER.map((member) => ({
    ...member,
    avatar: byId.get(member.discordId)?.avatar ?? null,
  }));
}
