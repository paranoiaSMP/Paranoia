import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string;
      minecraftName?: string | null;
      isMcVerified?: boolean;
      paraCoins?: number;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role?: string;
    minecraftName?: string | null;
    isMcVerified?: boolean;
    paraCoins?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    minecraftName?: string | null;
    isMcVerified?: boolean;
    paraCoins?: number;
  }
}
