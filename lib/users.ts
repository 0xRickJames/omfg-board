import "server-only";
import { getDb } from "@/lib/mongodb";
import type { User } from "@/lib/models";

export interface DiscordProfile {
  discordId: string;
  username: string;
  avatar: string | null;
}

export async function upsertUserFromDiscord(
  profile: DiscordProfile,
): Promise<User> {
  const db = await getDb();
  const users = db.collection<User>("users");

  const result = await users.findOneAndUpdate(
    { discordId: profile.discordId },
    {
      $set: { username: profile.username, avatar: profile.avatar },
      $setOnInsert: { discordId: profile.discordId, role: "member" },
    },
    { upsert: true, returnDocument: "after" },
  );

  if (!result) {
    throw new Error("Failed to upsert user");
  }
  return result;
}

export async function getUserByDiscordId(
  discordId: string,
): Promise<User | null> {
  const db = await getDb();
  return db.collection<User>("users").findOne({ discordId });
}
