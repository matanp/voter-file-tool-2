"use client";

import React, { useCallback, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { useToast } from "~/components/ui/use-toast";
import { useApiMutation } from "~/hooks/useApiMutation";
import type { MeetingSummary } from "./MeetingsManagement";

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (meeting: MeetingSummary) => void;
}

type CreateMeetingResponse = {
  meeting: {
    id: string;
    meetingDate: string;
    meetingType: string;
    notes: string | null;
  };
};

type CreateMeetingPayload = {
  meetingDate: string;
  meetingType?: string;
  notes?: string;
};

export function CreateMeetingDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateMeetingDialogProps) {
  const { toast } = useToast();
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingType, setMeetingType] = useState("EXECUTIVE_COMMITTEE");
  const [notes, setNotes] = useState("");

  const createMutation = useApiMutation<
    CreateMeetingResponse,
    CreateMeetingPayload
  >("/api/admin/meetings", "POST", {
    onSuccess: (data) => {
      toast({ title: "Meeting created" });
      const m = data.meeting;
      onCreated({
        id: m.id,
        meetingDate: m.meetingDate,
        meetingType: m.meetingType,
        notes: m.notes,
        createdBy: { name: "You", email: "" },
        createdAt: new Date().toISOString(),
        membershipCount: 0,
      });
      setMeetingDate("");
      setMeetingType("EXECUTIVE_COMMITTEE");
      setNotes("");
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = useCallback(() => {
    if (!meetingDate.trim()) {
      toast({
        title: "Validation",
        description: "Meeting date is required.",
        variant: "destructive",
      });
      return;
    }
    void createMutation.mutate({
      meetingDate: meetingDate.trim(),
      meetingType,
      notes: notes.trim() || undefined,
    });
  }, [meetingDate, meetingType, notes, createMutation, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Meeting Record</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="meeting-date">Meeting Date</Label>
            <Input
              id="meeting-date"
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="meeting-type">Meeting Type</Label>
            <Select value={meetingType} onValueChange={setMeetingType}>
              <SelectTrigger id="meeting-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXECUTIVE_COMMITTEE">
                  Executive Committee
                </SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="meeting-notes">Notes (optional)</Label>
            <Textarea
              id="meeting-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Meeting notes..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.loading}
          >
            {createMutation.loading ? "Creating..." : "Create Meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
