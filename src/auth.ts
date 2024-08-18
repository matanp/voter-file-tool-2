import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { Session } from "next-auth";
import Google from "next-auth/providers/google";
import prisma from "~/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  callbacks: {
    async session({ session, token, user }) {
      session.privilegeLevel = user.privilegeLevel;

      return session;
    },
  },
  providers: [Google],
});
