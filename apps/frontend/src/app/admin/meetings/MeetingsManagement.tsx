"use client";

import React, { useCallback, useState } from "react";
import { Button } from "~/components/ui/button";
import { CreateMeetingDialog } from "./CreateMeetingDialog";
import { PendingSubmissionsTable } from "./PendingSubmissionsTable";

export type MeetingSummary = {
  id: string;
  meetingDate: string;
  meetingType: string;
  notes: string | null;
  createdBy: { name: string | null; email: string };
  createdAt: string;
  membershipCount: number;
};

interface MeetingsManagementProps {
  activeTermId: string;
  initialMeetings: MeetingSummary[];
}

export function MeetingsManagement({
  activeTermId,
  initialMeetings,
}: MeetingsManagementProps) {
  const [meetings, setMeetings] = useState<MeetingSummary[]>(initialMeetings);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  const handleMeetingCreated = useCallback(
    (meeting: MeetingSummary) => {
      setMeetings((prev) => [meeting, ...prev]);
      setShowCreate(false);
    },
    [],
  );

  return (
    <div className="space-y-6">
      {/* Create Meeting */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Create a meeting record, then review and confirm or reject pending submissions.
        </p>
        <Button onClick={() => setShowCreate(true)}>New Meeting</Button>
      </div>

      <CreateMeetingDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={handleMeetingCreated}
      />

      {/* Meeting List */}
      {meetings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No meetings recorded yet. Create one to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => {
            const isSelected = selectedMeetingId === m.id;
            return (
              <div key={m.id} className="border rounded-lg">
                <button
                  type="button"
                  className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
                  onClick={() =>
                    setSelectedMeetingId(isSelected ? null : m.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {new Date(m.meetingDate).toLocaleDateString()} —{" "}
                        {m.meetingType.replace("_", " ")}
                      </p>
                      {m.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {m.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      <p>{m.membershipCount} decision(s)</p>
                      <p>
                        Created by {m.createdBy.name ?? m.createdBy.email}
                      </p>
                    </div>
                  </div>
                </button>

                {isSelected && (
                  <div className="border-t p-4">
                    <PendingSubmissionsTable
                      meetingId={m.id}
                      activeTermId={activeTermId}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
