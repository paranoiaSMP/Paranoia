import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: "MEMBER" | "MODERATOR" | "ADMIN" | "DEV" | string;
      minecraftName?: string;
      isMcVerified?: boolean;
      paraCoins?: number;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: "MEMBER" | "MODERATOR" | "ADMIN" | "DEV" | string;
    minecraftName?: string;
    isMcVerified?: boolean;
    paraCoins?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: "MEMBER" | "MODERATOR" | "ADMIN" | "DEV" | string;
    minecraftName?: string;
    isMcVerified?: boolean;
    paraCoins?: number;
  }
}
