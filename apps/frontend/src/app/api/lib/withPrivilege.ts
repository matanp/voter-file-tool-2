import type { Session } from "next-auth";
import type { PrivilegeLevel } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";

/** Privilege level or "Authenticated" (any valid session, no privilege check). */
export type AuthLevel = PrivilegeLevel | "Authenticated";

/** Session with user guaranteed to be defined (after withPrivilege guards). */
export type SessionWithUser = Session & {
  user: NonNullable<Session["user"]> & { id: string };
};

/**
 * Wraps API route handlers with session and optional privilege checks.
 * Use "Authenticated" for any logged-in user; use a PrivilegeLevel for role gating.
 * Handlers receive SessionWithUser (user is defined after the guard).
 */
export function withPrivilege<T extends NextRequest = NextRequest>(
  requiredLevel: AuthLevel,
  handler: (
    req: T,
    session: SessionWithUser,
    ...contextArgs: unknown[]
  ) => Promise<NextResponse>,
) {
  return async (req: T, ...contextArgs: unknown[]) => {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    const sessionWithUser = session as SessionWithUser;

    if (requiredLevel === "Authenticated") {
      return handler(req, sessionWithUser, ...contextArgs);
    }

    if (!session.user.privilegeLevel) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    if (!hasPermissionFor(session.user.privilegeLevel, requiredLevel)) {
      return NextResponse.json(
        { error: "User does not have sufficient privilege" },
        { status: 403 },
      );
    }

    return handler(req, sessionWithUser, ...contextArgs);
  };
}

/**
 * Wraps API route handlers with a custom verifier (e.g. webhook HMAC).
 * Verifier can return a result to pass to the handler (e.g. raw body); throws or rejects on failure.
 */
export function withBackendCheck<
  T extends NextRequest = NextRequest,
  TResult = void,
>(
  verify: (req: T) => Promise<TResult> | TResult,
  handler: (
    req: T,
    result: TResult,
    ...contextArgs: unknown[]
  ) => Promise<NextResponse>,
) {
  return async (req: T, ...contextArgs: unknown[]) => {
    try {
      const result = await Promise.resolve(verify(req));
      return handler(req, result, ...contextArgs);
    } catch {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }
  };
}

/**
 * Wraps API route handlers that are intentionally public (no auth).
 * Makes "no auth required" explicit at the call site.
 */
export function withPublic<T extends NextRequest = NextRequest>(
  handler: (req: T, ...contextArgs: unknown[]) => Promise<NextResponse>,
) {
  return async (req: T, ...contextArgs: unknown[]) => {
    return handler(req, ...contextArgs);
  };
}
