/**
 * SRS 3.1 — Admin jurisdiction CRUD.
 * POST: assign jurisdiction to a Leader user.
 * GET: list jurisdictions (optional userId, termId filters).
 */

import { AuditAction, PrivilegeLevel } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { logAuditEvent } from "~/lib/auditLog";
import {
  assignJurisdictionSchema,
  listJurisdictionsQuerySchema,
} from "~/lib/validations/committee";
import { validateRequest } from "~/app/api/lib/validateRequest";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";

async function postHandler(req: NextRequest, session: SessionWithUser) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const validation = validateRequest(body, assignJurisdictionSchema);
  if (!validation.success) return validation.response;

  const { userId, cityTown, legDistrict, termId } = validation.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, privilegeLevel: true },
  });
  if (!user) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 400 },
    );
  }
  if (user.privilegeLevel !== PrivilegeLevel.Leader) {
    return NextResponse.json(
      { success: false, error: "User must have Leader privilege to receive jurisdiction assignments" },
      { status: 400 },
    );
  }

  const term = await prisma.committeeTerm.findUnique({
    where: { id: termId },
    select: { id: true },
  });
  if (!term) {
    return NextResponse.json(
      { success: false, error: "Term not found" },
      { status: 400 },
    );
  }

  const legDistrictForDb: number | null = legDistrict ?? null;

  // Prisma findUnique does not support null in composite unique constraints.
  // Use findFirst when legDistrict is null ("all districts").
  const existing =
    legDistrictForDb === null
      ? await prisma.userJurisdiction.findFirst({
          where: { userId, cityTown, legDistrict: null, termId },
        })
      : await prisma.userJurisdiction.findUnique({
          where: {
            userId_cityTown_legDistrict_termId: {
              userId,
              cityTown,
              legDistrict: legDistrictForDb,
              termId,
            },
          },
        });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "This jurisdiction is already assigned to the user" },
      { status: 400 },
    );
  }

  try {
    const jurisdiction = await prisma.userJurisdiction.create({
      data: {
        userId,
        cityTown,
        legDistrict: legDistrictForDb,
        termId,
        createdById: session.user.id,
      },
    });

    const userRole = session.user.privilegeLevel ?? PrivilegeLevel.Admin;
    await logAuditEvent(
      session.user.id,
      userRole,
      AuditAction.JURISDICTION_ASSIGNED,
      "UserJurisdiction",
      jurisdiction.id,
      null,
      {
        userId,
        cityTown,
        legDistrict: legDistrictForDb,
        termId,
      },
    );

    return NextResponse.json(
      { success: true, jurisdiction },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error assigning jurisdiction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assign jurisdiction" },
      { status: 500 },
    );
  }
}

async function getHandler(req: NextRequest) {
  const query = {
    userId: req.nextUrl.searchParams.get("userId") ?? undefined,
    termId: req.nextUrl.searchParams.get("termId") ?? undefined,
  };
  const validation = validateRequest(query, listJurisdictionsQuerySchema);
  if (!validation.success) return validation.response;

  const { userId, termId } = validation.data;

  const where: { userId?: string; termId?: string } = {};
  if (userId) where.userId = userId;
  if (termId) where.termId = termId;

  const jurisdictions = await prisma.userJurisdiction.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: {
      user: { select: { name: true, email: true } },
      term: { select: { label: true } },
    },
    orderBy: [{ userId: "asc" }, { cityTown: "asc" }],
  });

  return NextResponse.json(jurisdictions, { status: 200 });
}

export const POST = withPrivilege(PrivilegeLevel.Admin, postHandler);
export const GET = withPrivilege(PrivilegeLevel.Admin, getHandler);
