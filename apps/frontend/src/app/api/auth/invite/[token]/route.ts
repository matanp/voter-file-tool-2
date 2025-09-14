import { NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { z } from "zod";

const tokenSchema = z.string().min(1, "Token is required");

async function getInviteHandler(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
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

    const invite = await prisma.invite.findUnique({
      where: { token },
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
        { status: 404 },
      );
    }

    // Check if invite is expired
    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: "This invite has expired" },
        { status: 400 },
      );
    }

    // Check if invite is already used
    if (invite.usedAt) {
      return NextResponse.json(
        { error: "This invite has already been used" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 },
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

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET /api/auth/invite/[token] - Validate invite token
export const GET = getInviteHandler;
