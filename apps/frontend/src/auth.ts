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

      // If user doesn't exist, check for valid invite
      if (!existingUser) {
        const validInvite = await prisma.invite.findFirst({
          where: {
            email: user.email,
            usedAt: null,
            deleted: false,
            expiresAt: {
              gt: new Date(),
            },
          },
        });

        // Only allow new user creation if they have a valid invite
        if (!validInvite) {
          return `/auth/access-denied?email=${encodeURIComponent(user.email)}`;
        }

        return true;
      }

      // For existing users, just sync their privilege level from PrivilegedUser table
      try {
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
      } catch (error) {
        console.error("Error updating user privileges:", error);
      }

      return true;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;

      try {
        // Check if user was created via invite by looking for a valid invite
        const validInvite = await prisma.invite.findFirst({
          where: {
            email: user.email,
            usedAt: null,
            deleted: false,
            expiresAt: {
              gt: new Date(),
            },
          },
        });

        if (validInvite) {
          console.log(
            `Found valid invite for new user: ${user.email}, marking as used`,
          );

          // Mark invite as used first
          await prisma.invite.update({
            where: { id: validInvite.id },
            data: {
              usedAt: new Date(),
            },
          });

          // Update user with invite's privilege level
          await prisma.user.update({
            where: { id: user.id },
            data: {
              privilegeLevel: validInvite.privilegeLevel,
            },
          });

          // Add user to PrivilegedUser table
          await prisma.privilegedUser.create({
            data: {
              email: user.email,
              privilegeLevel: validInvite.privilegeLevel,
            },
          });

          // Update user object in memory
          user.privilegeLevel = validInvite.privilegeLevel;
          return;
        }

        // For non-invite users, check if they should have privileges
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
