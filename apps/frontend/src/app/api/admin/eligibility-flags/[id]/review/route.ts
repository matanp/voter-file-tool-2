import { type NextRequest, NextResponse } from "next/server";
import { Prisma, PrivilegeLevel, type RemovalReason } from "@prisma/client";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { reviewEligibilityFlagSchema } from "~/lib/validations/eligibilityFlags";
import prisma from "~/lib/prisma";
import { logAuditEvent } from "~/lib/auditLog";

type RouteContext = { params?: Promise<{ id: string }> };

type ReviewDecision = "confirm" | "dismiss";

const VOTER_NOT_FOUND_DEFAULT_NOTE = "Voter not present in latest import";

function isJsonObject(
  value: Prisma.JsonValue | null,
): value is Prisma.JsonObject {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function buildUpdatedDetails(
  existing: Prisma.JsonValue | null,
  decision: ReviewDecision,
  notes?: string,
): Prisma.InputJsonValue | undefined {
  const merged: Record<string, unknown> = isJsonObject(existing)
    ? { ...existing }
    : existing != null
      ? { previousDetails: existing }
      : {};

  merged.reviewDecision = decision;
  if (notes && notes.trim() !== "") {
    merged.reviewNotes = notes.trim();
  }

  return Object.keys(merged).length > 0
    ? (merged as Prisma.InputJsonValue)
    : undefined;
}

function mapFlagReasonToRemoval(
  reason: "PARTY_MISMATCH" | "ASSEMBLY_DISTRICT_MISMATCH" | "POSSIBLY_INACTIVE" | "VOTER_NOT_FOUND",
  notes?: string,
): { removalReason: RemovalReason; removalNotes?: string } {
  if (reason === "PARTY_MISMATCH") {
    return {
      removalReason: "PARTY_CHANGE",
      ...(notes?.trim() ? { removalNotes: notes.trim() } : {}),
    };
  }
  if (reason === "ASSEMBLY_DISTRICT_MISMATCH") {
    return {
      removalReason: "MOVED_OUT_OF_DISTRICT",
      ...(notes?.trim() ? { removalNotes: notes.trim() } : {}),
    };
  }
  if (reason === "POSSIBLY_INACTIVE") {
    return {
      removalReason: "INACTIVE_REGISTRATION",
      ...(notes?.trim() ? { removalNotes: notes.trim() } : {}),
    };
  }
  if (reason === "VOTER_NOT_FOUND") {
    const normalizedNotes = notes?.trim();
    return {
      removalReason: "OTHER",
      removalNotes: normalizedNotes
        ? `${VOTER_NOT_FOUND_DEFAULT_NOTE}. ${normalizedNotes}`
        : VOTER_NOT_FOUND_DEFAULT_NOTE,
    };
  }

  return { removalReason: "OTHER", ...(notes?.trim() ? { removalNotes: notes.trim() } : {}) };
}

async function reviewEligibilityFlagHandler(
  req: NextRequest,
  session: SessionWithUser,
  ...contextArgs: unknown[]
) {
  const context = contextArgs[0] as RouteContext | undefined;
  const params = context?.params;
  if (!params) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { id } = await params;

  const body = (await req.json()) as unknown;
  const validation = validateRequest(body, reviewEligibilityFlagSchema);
  if (!validation.success) {
    return validation.response;
  }

  const { decision, notes } = validation.data;
  const userId = session.user.id;
  const userRole = session.user.privilegeLevel ?? PrivilegeLevel.Admin;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const flag = await tx.eligibilityFlag.findUnique({
        where: { id },
        include: {
          membership: {
            select: {
              id: true,
              status: true,
              seatNumber: true,
            },
          },
        },
      });

      if (!flag) {
        return { kind: "notFound" as const };
      }

      if (flag.status !== "PENDING") {
        return {
          kind: "notPending" as const,
          status: flag.status,
        };
      }

      const updatedDetails = buildUpdatedDetails(flag.details, decision, notes);
      const now = new Date();

      if (decision === "dismiss") {
        await tx.eligibilityFlag.update({
          where: { id: flag.id },
          data: {
            status: "DISMISSED",
            reviewedById: userId,
            reviewedAt: now,
            ...(updatedDetails ? { details: updatedDetails } : {}),
          },
        });

        await logAuditEvent(
          userId,
          userRole,
          "DISCREPANCY_RESOLVED",
          "EligibilityFlag",
          flag.id,
          {
            status: "PENDING",
            reason: flag.reason,
          },
          {
            status: "DISMISSED",
            reason: flag.reason,
          },
          {
            source: "boe_flagging",
            decision: "dismiss",
            flagId: flag.id,
            reason: flag.reason,
            ...(notes?.trim() ? { notes: notes.trim() } : {}),
          },
          tx,
        );

        return {
          kind: "dismissed" as const,
          status: "DISMISSED",
        };
      }

      if (flag.membership.status !== "ACTIVE") {
        return {
          kind: "membershipNotActive" as const,
          membershipStatus: flag.membership.status,
        };
      }

      const { removalReason, removalNotes } = mapFlagReasonToRemoval(
        flag.reason,
        notes,
      );

      await tx.committeeMembership.update({
        where: { id: flag.membership.id },
        data: {
          status: "REMOVED",
          removedAt: now,
          removalReason,
          ...(removalNotes ? { removalNotes } : {}),
        },
      });

      await logAuditEvent(
        userId,
        userRole,
        "MEMBER_REMOVED",
        "CommitteeMembership",
        flag.membership.id,
        {
          status: "ACTIVE",
          ...(flag.membership.seatNumber != null
            ? { seatNumber: flag.membership.seatNumber }
            : {}),
        },
        {
          status: "REMOVED",
          removalReason,
          ...(removalNotes ? { removalNotes } : {}),
        },
        {
          source: "boe_flagging",
          flagId: flag.id,
          reason: flag.reason,
        },
        tx,
      );

      await tx.eligibilityFlag.update({
        where: { id: flag.id },
        data: {
          status: "CONFIRMED",
          reviewedById: userId,
          reviewedAt: now,
          ...(updatedDetails ? { details: updatedDetails } : {}),
        },
      });

      await logAuditEvent(
        userId,
        userRole,
        "DISCREPANCY_RESOLVED",
        "EligibilityFlag",
        flag.id,
        {
          status: "PENDING",
          reason: flag.reason,
        },
        {
          status: "CONFIRMED",
          reason: flag.reason,
        },
        {
          source: "boe_flagging",
          decision: "confirm",
          flagId: flag.id,
          reason: flag.reason,
          ...(notes?.trim() ? { notes: notes.trim() } : {}),
        },
        tx,
      );

      return {
        kind: "confirmed" as const,
        status: "CONFIRMED",
      };
    });

    if (result.kind === "notFound") {
      return NextResponse.json({ error: "Eligibility flag not found" }, { status: 404 });
    }

    if (result.kind === "notPending") {
      return NextResponse.json(
        { error: `Eligibility flag already reviewed (${result.status})` },
        { status: 409 },
      );
    }

    if (result.kind === "membershipNotActive") {
      return NextResponse.json(
        {
          error: `Membership is ${result.membershipStatus}; only ACTIVE memberships can be confirmed for removal`,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        status: result.status,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to review eligibility flag:", error);
    return NextResponse.json(
      { error: "Failed to review eligibility flag" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(
  PrivilegeLevel.Admin,
  reviewEligibilityFlagHandler,
);
