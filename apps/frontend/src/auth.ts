import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import prisma from "~/lib/prisma";
import { PrivilegeLevel } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  callbacks: {
    async session({ session, user }) {
      session.privilegeLevel = user.privilegeLevel;
      return session;
    },
    async signIn({ user }) {
      if (!user.email) return false;

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!existingUser) return true;

      const privileged = await prisma.privilegedUser.findUnique({
        where: { email: user.email },
      });

      if (privileged && user.privilegeLevel !== privileged.privilegeLevel) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { privilegeLevel: privileged.privilegeLevel },
        });

        user.privilegeLevel = privileged.privilegeLevel; // update in memory object so the correct privilege level is maintained even before the next call to the db
      }

      if (!privileged && user.privilegeLevel !== PrivilegeLevel.ReadAccess) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { privilegeLevel: PrivilegeLevel.ReadAccess },
        });

        user.privilegeLevel = PrivilegeLevel.ReadAccess;
      }

      return true;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;

      const privilegedUser = await prisma.privilegedUser.findUnique({
        where: { email: user.email },
      });

      if (privilegedUser) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            privilegeLevel: privilegedUser.privilegeLevel,
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
