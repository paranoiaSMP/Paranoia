import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { isAdmin, isFounderUuid } from "@/lib/roles";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt"
  },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      issuer: "https://discord.com",
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        if (profile.avatar === null) {
          const defaultAvatarNumber = profile.discriminator === "0" 
            ? Number(BigInt(profile.id) >> 22n) % 6 
            : parseInt(profile.discriminator) % 5;
          profile.image_url = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
        } else {
          const format = profile.avatar.startsWith("a_") ? "gif" : "png";
          profile.image_url = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`;
        }
        return {
          id: profile.id,
          name: profile.global_name || profile.username,
          email: profile.email,
          image: profile.image_url,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'discord' && user.id) {
        try {
          const discordProfile = profile as any;
          let imageUrl = user.image;

          if (discordProfile.avatar === null) {
            const defaultAvatarNumber = discordProfile.discriminator === "0" 
              ? Number(BigInt(discordProfile.id) >> 22n) % 6 
              : parseInt(discordProfile.discriminator) % 5;
            imageUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
          } else if (discordProfile.avatar) {
            const format = discordProfile.avatar.startsWith("a_") ? "gif" : "png";
            imageUrl = `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.${format}`;
          }

          const newName = discordProfile.global_name || discordProfile.username || user.name;

          const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
          if (dbUser) {
            await prisma.user.update({
              where: { id: user.id },
              data: { name: newName, image: imageUrl, discordId: account.providerAccountId }
            });
          }
          user.name = newName;
          user.image = imageUrl;
        } catch (e) {
          console.error("Error updating user on signIn", e);
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, account }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.picture = user.image;
        token.role = user.role;
        token.minecraftName = user.minecraftName;
        token.isMcVerified = user.isMcVerified;
        token.paraCoins = user.paraCoins;
      }
      if (account?.provider === "discord") {
        token.discordId = account.providerAccountId;
      }
      if (trigger === "update" && token.id) {
        token.refreshedAt = 0;
      }

      const REFRESH_MS = 5 * 60 * 1000;
      if (token.id && (!token.refreshedAt || Date.now() - (token.refreshedAt as number) > REFRESH_MS)) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, minecraftName: true, minecraftUuid: true, isMcVerified: true, paraCoins: true, discordId: true },
          });
          if (dbUser) {
            const owner =
              !!process.env.ADMIN_DISCORD_ID &&
              (token.discordId ?? dbUser.discordId) === process.env.ADMIN_DISCORD_ID;
            const founder = isFounderUuid(dbUser.minecraftUuid);
            const role = owner ? "DEV" : founder && !isAdmin(dbUser.role) ? "ADMIN" : dbUser.role;
            if (role !== dbUser.role) {
              await prisma.user.update({ where: { id: token.id as string }, data: { role } });
            }
            token.role = role;
            token.minecraftName = dbUser.minecraftName ?? undefined;
            token.isMcVerified = dbUser.isMcVerified;
            token.paraCoins = dbUser.paraCoins;
          }
          token.refreshedAt = Date.now();
        } catch {
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.minecraftName = token.minecraftName;
        session.user.isMcVerified = token.isMcVerified;
        session.user.paraCoins = token.paraCoins;
      }
      return session;
    },
  },
};