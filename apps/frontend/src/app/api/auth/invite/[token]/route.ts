import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { z } from "zod";
import { withPublic } from "~/app/api/lib/withPrivilege";

const tokenSchema = z.string().trim().min(1, "Token is required");

type RouteContext = { params?: Promise<{ token: string }> };

async function getInviteHandler(
  _req: NextRequest,
  ...contextArgs: unknown[]
) {
  try {
    const context = contextArgs[0] as RouteContext | undefined;
    const params = context?.params;
    if (!params) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { token } = await params;

    const tokenValidation = tokenSchema.safeParse(token);
    if (!tokenValidation.success) {
      return NextResponse.json(
        {
          error: "Invalid invite link",
          details: tokenValidation.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    const validatedToken = tokenValidation.data;

    const invite = await prisma.invite.findUnique({
      where: { token: validatedToken },
      select: {
        id: true,
        email: true,
        privilegeLevel: true,
        customMessage: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
        deleted: true,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    // Check if invite is deleted
    if (invite.deleted) {
      return NextResponse.json(
        { error: "This invite has been deleted" },
        { status: 410 },
      );
    }

    // Check if invite is expired
    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: "This invite has expired" },
        { status: 410 },
      );
    }

    // Check if invite is already used
    if (invite.usedAt) {
      return NextResponse.json(
        { error: "This invite has already been used" },
        { status: 409 },
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 },
      );
    }

    // Return invite details (without sensitive token)
    return NextResponse.json({
      invite: {
        email: invite.email,
        privilegeLevel: invite.privilegeLevel,
        customMessage: invite.customMessage,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error validating invite:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET /api/auth/invite/[token] - Validate invite token (intentionally public)
export const GET = withPublic(getInviteHandler);
