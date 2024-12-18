import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import prisma from "~/lib/prisma";
import { accountPermissions } from "accountPermissions";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  callbacks: {
    async session({ session, user }) {
      session.privilegeLevel = user.privilegeLevel;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;

      if (accountPermissions.developer.includes(user.email)) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            privilegeLevel: "Developer",
          },
        });
      }
    },
  },
  pages: {
    error: "/error",
  },
  providers: [Google],
});
