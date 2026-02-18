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
      return NextResponse.json(
        {
          error: "User missing privilegeLevel",
          ...(session.user.id && { userId: session.user.id }),
          ...("email" in session.user &&
            session.user.email && { email: session.user.email }),
        },
        { status: 500 },
      );
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

/** Thrown by verifiers to indicate an expected auth failure (converted to 401). */
export class BackendAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendAuthError";
  }
}

/** Returns true only for errors that represent intended authorization failure. */
function isExpectedAuthError(err: unknown): boolean {
  return err instanceof BackendAuthError;
}

/**
 * Wraps API route handlers with a custom verifier (e.g. webhook HMAC).
 * Verifier can return a result to pass to the handler (e.g. raw body); throws or rejects on failure.
 * Throw BackendAuthError in verify for expected auth failures (401); other errors are logged and surfaced as 5xx.
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
    let result: TResult;
    try {
      result = await Promise.resolve(verify(req));
    } catch (verifyError) {
      const err =
        verifyError instanceof Error
          ? verifyError
          : new Error(String(verifyError));
      console.error(
        "[withBackendCheck] verify failed:",
        err.message,
        err.stack ?? "",
      );
      if (isExpectedAuthError(verifyError)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    try {
      return await handler(req, result, ...contextArgs);
    } catch (handlerError) {
      const err =
        handlerError instanceof Error
          ? handlerError
          : new Error(String(handlerError));
      console.error(
        "[withBackendCheck] handler failed:",
        err.message,
        err.stack ?? "",
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

/**
 * Wraps API route handlers that are intentionally public (no auth).
 * Makes "no auth required" explicit at the call site.
 * Handlers can type the optional route context via the second generic (e.g. RouteContext).
 */
export function withPublic<T extends NextRequest = NextRequest, C = unknown>(
  handler: (req: T, context?: C) => Promise<NextResponse>,
) {
  return async (req: T, ...contextArgs: unknown[]) => {
    const context = contextArgs[0] as C | undefined;
    return handler(req, context);
  };
}
