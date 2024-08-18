import { PrivilegeLevel } from "@prisma/client";
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session extends DefaultSession {
    privilegeLevel: PrivilegeLevel;
  }

  interface User extends DefaultUser {
    privilegeLevel: PrivilegeLevel;
  }
}
