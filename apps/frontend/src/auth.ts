import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { canonicalizeAuthEmail } from "@voter-file-tool/shared-validators";
import prisma from "~/lib/prisma";
import { PrivilegeLevel } from "@prisma/client";
import { findValidUnusedInvite } from "~/lib/applyPendingInvite";

type AuthAdapter = ReturnType<typeof PrismaAdapter>;

const baseAdapter = PrismaAdapter(prisma);
const adapter: AuthAdapter = baseAdapter;

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter,
  callbacks: {
    async session({ session, user }) {
      if (session.user?.email) {
        session.user.email = canonicalizeAuthEmail(session.user.email);
      }
      session.privilegeLevel = user.privilegeLevel;
      session.user.privilegeLevel = user.privilegeLevel;
      return session;
    },
    async signIn({ user }) {
      if (!user.email) return false;

      user.email = canonicalizeAuthEmail(user.email);

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      // If user doesn't exist, check PrivilegedUser first, then invites
      if (!existingUser) {
        const privilegedUser = await prisma.privilegedUser.findUnique({
          where: { email: user.email },
        });

        // Allow sign-in if user is in PrivilegedUser table
        if (privilegedUser) {
          return true;
        }

        // Fall back to invite system
        const validInvite = await findValidUnusedInvite(user.email);

        // Only allow new user creation if they have a valid invite
        if (!validInvite) {
          return `/auth/access-denied?email=${encodeURIComponent(user.email)}`;
        }

        return true;
      }

      // For existing users, sync privilege level from PrivilegedUser table
      try {
        const privileged = await prisma.privilegedUser.findUnique({
          where: { email: user.email },
        });

        if (
          privileged &&
          existingUser.privilegeLevel !== privileged.privilegeLevel
        ) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { privilegeLevel: privileged.privilegeLevel },
          });
        }

        if (
          !privileged &&
          existingUser.privilegeLevel !== PrivilegeLevel.ReadAccess
        ) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { privilegeLevel: PrivilegeLevel.ReadAccess },
          });
        }

        user.privilegeLevel =
          privileged?.privilegeLevel ?? PrivilegeLevel.ReadAccess;
      } catch (error) {
        console.error("Error updating user privileges:", error);
      }

      return true;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email || !user.id) return;

      user.email = canonicalizeAuthEmail(user.email);

      try {
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
          user.privilegeLevel = privilegedUser.privilegeLevel;
        }
      } catch (error) {
        console.error("Error in createUser event:", error);
      }
    },
  },
  pages: {
    error: "/error",
  },
  providers: [Google],
});
