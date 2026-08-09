import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt"
  },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
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
              data: { name: newName, image: imageUrl }
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
   
    async jwt({ token, user, trigger, session, account }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.picture = user.image;
        token.role = (user as any).role;
        token.minecraftName = (user as any).minecraftName;
        token.isMcVerified = (user as any).isMcVerified;
        token.paraCoins = (user as any).paraCoins;
      }
      if (account && account.provider === 'discord' && account.providerAccountId === process.env.ADMIN_DISCORD_ID) {
        token.role = 'ADMIN';
      }
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });
        if (dbUser) {
          token.minecraftName = dbUser.minecraftName;
          token.isMcVerified = dbUser.isMcVerified;
          token.paraCoins = dbUser.paraCoins;
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
        (session.user as any).paraCoins = token.paraCoins;
      }
      return session;
    },
  },
};