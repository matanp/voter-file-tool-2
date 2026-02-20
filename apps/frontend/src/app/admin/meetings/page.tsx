import React from "react";
import prisma from "~/lib/prisma";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import { MeetingsManagement } from "./MeetingsManagement";

export default async function MeetingsPage() {
  let activeTermId: string | null = null;
  try {
    activeTermId = await getActiveTermId();
  } catch {
    // No active term
  }

  if (activeTermId == null) {
    return (
      <div className="w-full p-6">
        <h1 className="text-2xl font-semibold mb-6">Meetings</h1>
        <p className="text-muted-foreground">
          No active committee term is set. Configure an active term to manage meetings.
        </p>
      </div>
    );
  }

  const meetings = await prisma.meetingRecord.findMany({
    orderBy: { meetingDate: "desc" },
    take: 20,
    include: {
      _count: { select: { memberships: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  const serializedMeetings = meetings.map((m) => ({
    id: m.id,
    meetingDate: m.meetingDate.toISOString(),
    meetingType: m.meetingType,
    notes: m.notes,
    createdBy: m.createdBy,
    createdAt: m.createdAt.toISOString(),
    membershipCount: m._count.memberships,
  }));

  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-semibold mb-6">Meetings</h1>
      <MeetingsManagement
        activeTermId={activeTermId}
        initialMeetings={serializedMeetings}
      />
    </div>
  );
}
