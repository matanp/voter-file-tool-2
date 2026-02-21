/**
 * SRS 2.4 — Meeting Record CRUD.
 * POST: create a new MeetingRecord.
 * GET:  list meetings with membership counts.
 */

import { PrivilegeLevel, MeetingType } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { logAuditEvent } from "~/lib/auditLog";
import { createMeetingSchema } from "~/lib/validations/committee";
import { validateRequest } from "~/app/api/lib/validateRequest";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";

// ── POST /api/admin/meetings ────────────────────────────────────────────────

async function createMeetingHandler(
  req: NextRequest,
  session: SessionWithUser,
) {
  const body = (await req.json()) as unknown;
  const validation = validateRequest(body, createMeetingSchema);
  if (!validation.success) return validation.response;

  const { meetingDate, meetingType, notes } = validation.data;
  const userId = session.user.id;
  const userRole = session.user.privilegeLevel ?? PrivilegeLevel.Admin;

  try {
    const meeting = await prisma.meetingRecord.create({
      data: {
        meetingDate: new Date(meetingDate),
        meetingType: meetingType ?? MeetingType.EXECUTIVE_COMMITTEE,
        notes: notes ?? null,
        createdById: userId,
      },
    });

    await logAuditEvent(
      userId,
      userRole,
      "MEETING_CREATED",
      "MeetingRecord",
      meeting.id,
      null,
      {
        meetingDate: meeting.meetingDate.toISOString(),
        meetingType: meeting.meetingType,
        notes: meeting.notes,
      },
    );

    return NextResponse.json(
      {
        meeting: {
          id: meeting.id,
          meetingDate: meeting.meetingDate.toISOString(),
          meetingType: meeting.meetingType,
          notes: meeting.notes,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating meeting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(
  PrivilegeLevel.Admin,
  createMeetingHandler,
);

// ── GET /api/admin/meetings ─────────────────────────────────────────────────

async function listMeetingsHandler(
  req: NextRequest,
  _session: SessionWithUser,
) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const offset = (page - 1) * limit;

    const [meetings, total] = await Promise.all([
      prisma.meetingRecord.findMany({
        orderBy: { meetingDate: "desc" },
        skip: offset,
        take: limit,
        include: {
          _count: {
            select: { memberships: true },
          },
          createdBy: { select: { name: true, email: true } },
        },
      }),
      prisma.meetingRecord.count(),
    ]);

    return NextResponse.json({
      meetings: meetings.map((m) => ({
        id: m.id,
        meetingDate: m.meetingDate.toISOString(),
        meetingType: m.meetingType,
        notes: m.notes,
        createdBy: m.createdBy,
        createdAt: m.createdAt.toISOString(),
        membershipCount: m._count.memberships,
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error listing meetings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Admin, listMeetingsHandler);
