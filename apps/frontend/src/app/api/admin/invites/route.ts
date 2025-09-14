import { type NextRequest, NextResponse } from "next/server";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import prisma from "~/lib/prisma";
import { randomBytes } from "crypto";
import { z } from "zod";
import type { Session } from "next-auth";

const createInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  privilegeLevel: z
    .nativeEnum(PrivilegeLevel, {
      errorMap: () => ({ message: "Invalid privilege level" }),
    })
    .refine((level) => level !== PrivilegeLevel.Developer, {
      message: "Developer privilege level is not allowed for invites",
    }),
  customMessage: z.string().optional(),
  expiresInDays: z.number().min(1).max(365).optional().default(7),
});

async function createInviteHandler(req: NextRequest, session: Session) {
  try {
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    const body = (await req.json()) as unknown;
    const parsed = createInviteSchema.parse(body);
    const { email, privilegeLevel, customMessage, expiresInDays } = parsed;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 },
      );
    }

    // Check if there's already a valid invite for this email
    const existingInvite = await prisma.invite.findFirst({
      where: {
        email,
        usedAt: null,
        deleted: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "A valid invite already exists for this email" },
        { status: 400 },
      );
    }

    // Generate unique token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create invite
    const invite = await prisma.invite.create({
      data: {
        email,
        token,
        privilegeLevel,
        customMessage,
        expiresAt,
        createdBy: session.user.id,
      },
    });

    // Generate invite URL
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl}/auth/invite/${token}`;

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        privilegeLevel: invite.privilegeLevel,
        customMessage: invite.customMessage,
        expiresAt: invite.expiresAt,
        inviteUrl,
      },
    });
  } catch (error) {
    console.error("Error creating invite:", error);

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

async function getInvitesHandler(_req: NextRequest, _session: Session) {
  try {
    const invites = await prisma.invite.findMany({
      where: {
        deleted: false,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        token: true,
        privilegeLevel: true,
        customMessage: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
        createdBy: true,
      },
    });

    return NextResponse.json({ invites });
  } catch (error) {
    console.error("Error fetching invites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function deleteInviteHandler(req: NextRequest, session: Session) {
  try {
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    const url = new URL(req.url);
    const inviteId = url.searchParams.get("id");

    if (!inviteId) {
      return NextResponse.json(
        { error: "Invite ID is required" },
        { status: 400 },
      );
    }

    // Check if invite exists
    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    await prisma.invite.update({
      where: { id: inviteId },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Invite deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/admin/invites - Create new invite
export const POST = withPrivilege(PrivilegeLevel.Admin, createInviteHandler);

// GET /api/admin/invites - Get all invites
export const GET = withPrivilege(PrivilegeLevel.Admin, getInvitesHandler);

// DELETE /api/admin/invites - Delete invite
export const DELETE = withPrivilege(PrivilegeLevel.Admin, deleteInviteHandler);
