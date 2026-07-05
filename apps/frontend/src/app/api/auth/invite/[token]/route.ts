import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { withPublic } from "~/app/api/lib/withPrivilege";
import { loadValidUnusedInvite } from "~/app/api/auth/invite/loadValidInvite";

type RouteContext = { params?: Promise<{ token: string }> };

/** Handle GET invite by token and return invite data or appropriate error (404/400/409/410/500). */
async function getInviteHandler(_req: NextRequest, context?: RouteContext) {
  try {
    const params = context?.params;
    if (!params) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { token } = await params;

    const loaded = await loadValidUnusedInvite(token);
    if (!loaded.ok) {
      const { status, error, details } = loaded.error;
      return NextResponse.json(
        details ? { error, details } : { error },
        { status },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: loaded.invite.email },
    });

    if (existingUser) {
      return NextResponse.json({ invite: loaded.payload, existingAccount: true });
    }

    return NextResponse.json({ invite: loaded.payload });
  } catch (error) {
    console.error("Error validating invite:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET /api/auth/invite/[token] - Validate invite token (intentionally public)
export const GET = withPublic<NextRequest, RouteContext>(getInviteHandler);
