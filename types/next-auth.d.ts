import type { UserRole } from "@/lib/models";

declare module "next-auth" {
  interface Session {
    user: {
      discordId: string;
      role: UserRole;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discordId?: string;
    role?: UserRole;
    username?: string;
    avatar?: string | null;
  }
}
