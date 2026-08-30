"use client";

import { Button } from "~/components/ui/button";
import { useToast } from "~/components/ui/use-toast";
import { useApiMutation } from "~/hooks/useApiMutation";

type ApiErrorWithBody = Error & {
  apiErrorBody?: { error?: string; reason?: string };
};

/** Session-only undo control for a resolved committee upload discrepancy. */
export function DiscrepancyUndoButton({
  VRCNUM,
  onUndo,
}: {
  VRCNUM: string;
  onUndo: () => void;
}) {
  const { toast } = useToast();

  const undoMutation = useApiMutation<
    { success: boolean; addressRestoreSkipped?: boolean },
    { VRCNUM: string }
  >("/api/admin/handleCommitteeDiscrepancy/undo", "POST", {
    onSuccess: (data) => {
      onUndo();
      if (data.addressRestoreSkipped) {
        toast({
          title: "Discrepancy reopened",
          description:
            "Address was not changed because it was edited after acceptance.",
        });
      } else {
        toast({
          title: "Undone",
          description: "Discrepancy decision was reversed.",
        });
      }
    },
    onError: (error) => {
      const apiError = error as ApiErrorWithBody;
      let description = error.message;

      if (apiError.apiErrorBody?.reason === "membership_diverged") {
        description =
          "Committee membership changed since resolve; undo is no longer available.";
      } else if (apiError.apiErrorBody?.reason === "not_resolved") {
        description =
          "This discrepancy was already undone, never resolved, or superseded by an upload.";
      }

      toast({
        title: "Undo failed",
        description,
      });
    },
  });

  const handleUndo = async () => {
    if (undoMutation.loading) {
      return;
    }
    await undoMutation.mutate({ VRCNUM });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="ml-2"
      disabled={undoMutation.loading}
      onClick={() => {
        void handleUndo();
      }}
    >
      {undoMutation.loading ? "Undoing..." : "Undo"}
    </Button>
  );
}
