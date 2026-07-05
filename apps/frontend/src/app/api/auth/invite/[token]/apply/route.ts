import type { InviteJurisdiction, Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authEmailsEqual } from "@voter-file-tool/shared-validators";
import { findActiveTerm } from "~/app/api/lib/committeeValidation";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import { loadInviteForApply } from "~/app/api/auth/invite/loadValidInvite";
import {
  applyPendingInvite,
  auditInviteJurisdictionGrants,
  InviteGrantError,
} from "~/lib/applyPendingInvite";
import prisma from "~/lib/prisma";

type RouteContext = { params?: Promise<{ token: string }> };

const STALE_INVITE_SCOPE_MESSAGE =
  "This invite's committee term is no longer active; ask an admin to re-issue it.";

class StaleInviteScopeError extends Error {
  constructor() {
    super(STALE_INVITE_SCOPE_MESSAGE);
    this.name = "StaleInviteScopeError";
  }
}

async function assertInviteScopeUsesActiveTerm(
  tx: Prisma.TransactionClient,
  jurisdictions: InviteJurisdiction[],
) {
  if (jurisdictions.length === 0) return;

  const activeTerm = await findActiveTerm(tx);
  if (!activeTerm) {
    throw new StaleInviteScopeError();
  }

  const hasStaleScope = jurisdictions.some(
    (jurisdiction) => jurisdiction.termId !== activeTerm.id,
  );
  if (hasStaleScope) {
    throw new StaleInviteScopeError();
  }
}

async function applyInviteHandler(
  _req: NextRequest,
  session: SessionWithUser,
  ...contextArgs: unknown[]
) {
  try {
    const context = contextArgs[0] as RouteContext | undefined;
    const params = context?.params;
    if (!params) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { token } = await params;

    const sessionEmail = session.user.email;
    if (!sessionEmail) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    const loaded = await loadInviteForApply(token, sessionEmail);
    if (!loaded.ok) {
      const { status, error, details } = loaded.error;
      return NextResponse.json(
        details ? { error, details } : { error },
        { status },
      );
    }

    if (!authEmailsEqual(sessionEmail, loaded.invite.email)) {
      return NextResponse.json(
        { error: "Signed-in email does not match this invite" },
        { status: 403 },
      );
    }

    try {
      const grantResult = await prisma.$transaction(async (tx) => {
        if (!loaded.invite.usedAt) {
          await assertInviteScopeUsesActiveTerm(tx, loaded.invite.jurisdictions);
        }

        const result = await applyPendingInvite(sessionEmail, session.user.id, {
          tx,
          expectedInviteId: loaded.invite.id,
        });

        if (result.status === "applied") {
          await auditInviteJurisdictionGrants({
            userId: session.user.id,
            inviteId: result.inviteId,
            createdBy: result.createdBy,
            jurisdictions: result.jurisdictions,
            tx,
          });
        }

        return result;
      });

      if (
        grantResult.status === "applied" ||
        grantResult.status === "already_applied"
      ) {
        return NextResponse.json({
          status: grantResult.status,
          privilegeLevel: grantResult.privilegeLevel,
        });
      }

      return NextResponse.json(
        { error: "No pending invite to apply" },
        { status: 404 },
      );
    } catch (error) {
      if (error instanceof StaleInviteScopeError) {
        return NextResponse.json(
          { error: error.message, reason: "stale-term" },
          { status: 409 },
        );
      }
      if (error instanceof InviteGrantError) {
        return NextResponse.json(
          { error: "Invite grant failed", reason: "grant-failed" },
          { status: 400 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error applying invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege("Authenticated", applyInviteHandler);
