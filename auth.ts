import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { upsertUserFromDiscord, getUserByDiscordId } from "@/lib/users";
import type { UserRole } from "@/lib/models";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.id) return false;
      await upsertUserFromDiscord({
        discordId: profile.id as string,
        username: (profile.username as string) ?? "unknown",
        avatar: (profile.image_url as string) ?? null,
      });
      return true;
    },
    async jwt({ token, profile }) {
      const discordId = (profile?.id as string) ?? (token.discordId as string);
      if (discordId) {
        const user = await getUserByDiscordId(discordId);
        if (user) {
          token.discordId = user.discordId;
          token.role = user.role;
          token.username = user.username;
          token.avatar = user.avatar;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.discordId = token.discordId as string;
        session.user.role = token.role as UserRole;
        if (token.username) session.user.name = token.username as string;
        if (token.avatar) session.user.image = token.avatar as string;
      }
      return session;
    },
  },
});
