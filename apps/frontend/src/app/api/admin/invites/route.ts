import { type NextRequest, NextResponse } from "next/server";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { Prisma, PrivilegeLevel } from "@prisma/client";
import prisma from "~/lib/prisma";
import { randomBytes } from "crypto";
import { z } from "zod";
import type { Session } from "next-auth";
import { inviteJurisdictionSchema } from "~/lib/validations/committee";
import {
  formatJurisdictionNotFoundMessage,
  getActiveTermId,
  jurisdictionExistsInCommitteeList,
} from "~/app/api/lib/committeeValidation";

const createInviteSchema = z
  .object({
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
    // SRS 3.1 — Jurisdiction scope for Leader invites, applied on invite acceptance (lib/applyPendingInvite.ts).
    jurisdictions: z.array(inviteJurisdictionSchema).optional(),
  })
  .superRefine((data, ctx) => {
    const hasJurisdictions = (data.jurisdictions?.length ?? 0) > 0;
    if (data.privilegeLevel === PrivilegeLevel.Leader && !hasJurisdictions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["jurisdictions"],
        message: "Leader invites require at least one jurisdiction",
      });
    }
    if (data.privilegeLevel !== PrivilegeLevel.Leader && hasJurisdictions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["jurisdictions"],
        message: "Only Leader invites can include jurisdictions",
      });
    }
  });

const DUPLICATE_PENDING_INVITE = "DUPLICATE_PENDING_INVITE";

async function createInviteHandler(req: NextRequest, session: Session) {
  try {
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    const createdById = session.user.id;

    const body = (await req.json()) as unknown;
    const parsed = createInviteSchema.parse(body);
    const { email, privilegeLevel, customMessage, expiresInDays } = parsed;
    const jurisdictions = parsed.jurisdictions ?? [];

    if (privilegeLevel === PrivilegeLevel.Leader) {
      try {
        await getActiveTermId();
      } catch {
        return NextResponse.json(
          {
            error:
              "Leader invites require an active committee term. Activate a term in Admin > Terms first.",
          },
          { status: 400 },
        );
      }
    }

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

    // Validate and de-duplicate Leader jurisdiction scope before creating the invite.
    // legDistrict undefined ("all districts") is normalized to null so it dedupes correctly.
    const normalizedJurisdictions = jurisdictions.map((j) => ({
      cityTown: j.cityTown,
      legDistrict: j.legDistrict ?? null,
      termId: j.termId,
    }));
    const seen = new Set<string>();
    const dedupedJurisdictions = normalizedJurisdictions.filter((j) => {
      const key = `${j.cityTown}|${j.legDistrict ?? "all"}|${j.termId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Jurisdiction scope is pinned to the active term (the admin UI only offers
    // active-term city/LD options). Reject any jurisdiction targeting another
    // term until per-term scope is supported and validated against committee data.
    if (dedupedJurisdictions.length > 0) {
      let activeTermId: string;
      try {
        activeTermId = await getActiveTermId();
      } catch {
        return NextResponse.json(
          { error: "No active committee term is set" },
          { status: 400 },
        );
      }
      const offTermId = dedupedJurisdictions
        .map((j) => j.termId)
        .find((id) => id !== activeTermId);
      if (offTermId) {
        return NextResponse.json(
          { error: "Jurisdictions must target the active committee term" },
          { status: 400 },
        );
      }

      for (const j of dedupedJurisdictions) {
        const exists = await jurisdictionExistsInCommitteeList(j);
        if (!exists) {
          return NextResponse.json(
            {
              error: formatJurisdictionNotFoundMessage(j, "active term"),
            },
            { status: 400 },
          );
        }
      }
    }

    // Generate unique token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    let invite;
    try {
      invite = await prisma.$transaction(async (tx) => {
        const now = new Date();
        await tx.invite.updateMany({
          where: {
            email,
            usedAt: null,
            deleted: false,
            expiresAt: { lte: now },
          },
          data: { deleted: true, deletedAt: now },
        });

        const existingInvite = await tx.invite.findFirst({
          where: {
            email,
            usedAt: null,
            deleted: false,
            expiresAt: { gt: now },
          },
        });

        if (existingInvite) {
          throw new Error(DUPLICATE_PENDING_INVITE);
        }

        return tx.invite.create({
          data: {
            email,
            token,
            privilegeLevel,
            customMessage,
            expiresAt,
            createdBy: createdById,
            jurisdictions:
              dedupedJurisdictions.length > 0
                ? { create: dedupedJurisdictions }
                : undefined,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === DUPLICATE_PENDING_INVITE
      ) {
        return NextResponse.json(
          { error: "A valid invite already exists for this email" },
          { status: 400 },
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "A valid invite already exists for this email" },
          { status: 400 },
        );
      }
      throw error;
    }

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
        jurisdictions: {
          select: {
            id: true,
            cityTown: true,
            legDistrict: true,
            termId: true,
            term: { select: { label: true } },
          },
          orderBy: [{ cityTown: "asc" }, { legDistrict: "asc" }],
        },
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
