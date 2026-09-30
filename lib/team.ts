import "server-only";
import { getDb } from "@/lib/mongodb";
import type { User } from "@/lib/models";

export const TEAM_ROSTER = [
  {
    discordId: "267142718856101889",
    name: "Rick",
    googleEmail: "rick@omnipair.fi",
    githubUsernames: ["0xRickJames"],
  },
  {
    discordId: "1353331899111837757",
    name: "Rakka",
    googleEmail: "muhammed@omnipair.fi",
    githubUsernames: ["elrakabawi", "rakka-sol"],
  },
  {
    discordId: "967378400257933312",
    name: "Haz",
    googleEmail: "hazim@omnipair.fi",
    githubUsernames: ["Hazim-om"],
  },
  {
    discordId: "1237545047260528641",
    name: "Ivan",
    googleEmail: "ivan@omnipair.fi",
    githubUsernames: ["tr4c4"],
  },
  {
    discordId: "236508020341866497",
    name: "Zee",
    googleEmail: "zee@omnipair.fi",
    githubUsernames: ["0xMoaz"],
  },
  {
    discordId: "819925149393485835",
    name: "Olesia",
    googleEmail: "olesia@omnipair.fi",
    githubUsernames: [],
  },
] as const;

/** Matches a GitHub username (case-insensitive) to a team member — used by
 *  the commit-activity Discord feed to show a real name instead of
 *  whatever's in someone's local git config. */
export function findTeamMemberByGithubUsername(username: string | undefined | null) {
  if (!username) return undefined;
  const lower = username.toLowerCase();
  return TEAM_ROSTER.find((m) => m.githubUsernames.some((u) => u.toLowerCase() === lower));
}

export interface TeamMember {
  discordId: string;
  name: string;
  googleEmail: string;
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
