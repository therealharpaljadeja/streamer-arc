import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && account.providerAccountId) {
        await prisma.user.upsert({
          where: { googleId: account.providerAccountId },
          update: {
            name: user.name,
            image: user.image,
          },
          create: {
            googleId: account.providerAccountId,
            email: user.email!,
            name: user.name,
            image: user.image,
          },
        });
      }
      return true;
    },
    async jwt({ token, account }) {
      if (account?.providerAccountId) {
        const dbUser = await prisma.user.findUnique({
          where: { googleId: account.providerAccountId },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.hasWallet = !!dbUser.circleWalletAddress;
          token.hasOnboarded = !!dbUser.circleWalletAddress && !!dbUser.gifUrl;
          token.circleWalletAddress = dbUser.circleWalletAddress ?? undefined;
        }
      } else if (token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId },
        });
        if (dbUser) {
          token.hasWallet = !!dbUser.circleWalletAddress;
          token.hasOnboarded = !!dbUser.circleWalletAddress && !!dbUser.gifUrl;
          token.circleWalletAddress = dbUser.circleWalletAddress ?? undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId;
        session.user.hasWallet = token.hasWallet ?? false;
        session.user.hasOnboarded = token.hasOnboarded ?? false;
        session.user.circleWalletAddress = token.circleWalletAddress ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
