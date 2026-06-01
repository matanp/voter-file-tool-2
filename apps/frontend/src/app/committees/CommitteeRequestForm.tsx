import type { VoterRecord } from "@prisma/client";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import RecordSearchForm from "../components/RecordSearchForm";
import { Switch } from "~/components/ui/switch";
import { toast } from "~/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { VoterRecordTable } from "../recordsearch/VoterRecordTable";
import { useApiMutation } from "~/hooks/useApiMutation";
import type {
  CommitteeRequestData,
  CommitteeRequestResponse,
} from "~/lib/validations/committee";
import type { EligibilityPreflightResponse } from "~/lib/eligibilityPreflight";
import {
  ELIGIBILITY_ESCALATION_MESSAGE,
  getIneligibilityMessages,
} from "~/lib/eligibilityMessages";
import EligibilitySnapshotPanel from "./EligibilitySnapshotPanel";

type CommitteeRequestFormProps = {
  city: string;
  legDistrict: string;
  electionDistrict: number;
  committeeListId?: number | null;
  defaultOpen: boolean;
  onOpenChange: (open: boolean) => void;
  committeeList: VoterRecord[];
  maxSeatsPerLted?: number;
  onSubmit: () => void;
  addMember?: VoterRecord;
  removeMember?: VoterRecord;
};

type ApiEligibilityError = Error & {
  apiErrorBody?: { error?: string; reasons?: string[] };
};

export const CommitteeRequestForm: React.FC<CommitteeRequestFormProps> = ({
  city,
  legDistrict,
  electionDistrict,
  committeeListId = null,
  defaultOpen,
  onOpenChange,
  committeeList,
  maxSeatsPerLted = 4,
  onSubmit,
  addMember,
  removeMember,
}) => {
  const [requestNotes, setRequestNotes] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [removeFormOpen, setRemoveFormOpen] = useState<boolean>(false);
  const [requestAddMember, setRequestAddMember] = useState<VoterRecord | null>(
    addMember ?? null,
  );
  const [requestRemoveMember, setRequestRemoveMember] =
    useState<VoterRecord | null>(removeMember ?? null);
  const [addFormRecords, setAddFormRecords] = useState<VoterRecord[]>([]);
  const [addMemberFormOpen, setAddMemberFormOpen] = useState<boolean>(false);
  const [preflightLoading, setPreflightLoading] = useState<boolean>(false);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<EligibilityPreflightResponse | null>(
    null,
  );
  const [submissionFailureMessages, setSubmissionFailureMessages] = useState<
    string[] | null
  >(null);

  const buildBlockedSubmissionToastDescription = (messages: string[]): string =>
    `${messages.join(" ")} ${ELIGIBILITY_ESCALATION_MESSAGE}`;

  // API mutation hook
  const requestMutation = useApiMutation<
    CommitteeRequestResponse,
    CommitteeRequestData
  >("/api/committee/requestAdd", "POST", {
    onSuccess: (res) => {
      const warningText =
        res?.success && "warnings" in res && res.warnings?.length
          ? res.warnings.map((w) => w.message).join(" ")
          : "";
      toast({
        title: "Success",
        description: warningText
          ? `Submitted your request for approval. ${warningText}`
          : "Submitted your request for approval",
      });
      onSubmit();
      setRequestNotes("");
      setRequestAddMember(null);
      setRequestRemoveMember(null);
      setPreflight(null);
      setPreflightError(null);
      setPreflightLoading(false);
      setSubmissionFailureMessages(null);
    },
    onError: (error) => {
      const apiBody = (error as ApiEligibilityError).apiErrorBody;
      if (apiBody?.error === "INELIGIBLE") {
        const failureMessages = getIneligibilityMessages(apiBody.reasons);
        setSubmissionFailureMessages(failureMessages);
        toast({
          title: "Submission blocked",
          description: buildBlockedSubmissionToastDescription(failureMessages),
          variant: "destructive",
        });
        return;
      }

      setSubmissionFailureMessages(null);
      toast({
        title: "Error",
        description: error.message || "Something went wrong with your request",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (requestAddMember == null || committeeListId == null) {
      setPreflight(null);
      setPreflightError(null);
      setPreflightLoading(false);
      return;
    }

    const controller = new AbortController();
    setPreflightLoading(true);
    setPreflightError(null);
    setPreflight(null);

    const params = new URLSearchParams({
      voterRecordId: requestAddMember.VRCNUM,
      committeeListId: String(committeeListId),
    });

    void fetch(`/api/committee/eligibility?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? "Failed to check eligibility");
        }
        return (await response.json()) as EligibilityPreflightResponse;
      })
      .then((data) => {
        setPreflight(data);
      })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Failed to check eligibility";
        setPreflightError(message);
      })
      .finally(() => {
        setPreflightLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [
    requestAddMember,
    requestAddMember?.VRCNUM,
    committeeListId,
    city,
    legDistrict,
    electionDistrict,
  ]);

  useEffect(() => {
    setSubmissionFailureMessages(null);
  }, [
    requestAddMember?.VRCNUM,
    requestRemoveMember?.VRCNUM,
    requestNotes,
    contactEmail,
    contactPhone,
  ]);

  const hasHardStops = (preflight?.hardStops.length ?? 0) > 0;
  const requiresAddPreflight = requestAddMember != null;
  const isSubmitBlocked =
    requestMutation.loading ||
    (!requestAddMember && !requestRemoveMember) ||
    (!!requestRemoveMember && !requestAddMember) ||
    (requiresAddPreflight &&
      (committeeListId == null ||
        preflightLoading ||
        preflight == null ||
        preflightError != null ||
        hasHardStops));

  const handleSubmit = async (
    _event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    if (requiresAddPreflight && hasHardStops) {
      const failureMessages = getIneligibilityMessages(preflight?.hardStops);
      setSubmissionFailureMessages(failureMessages);
      toast({
        title: "Submission blocked",
        description: buildBlockedSubmissionToastDescription(failureMessages),
        variant: "destructive",
      });
      return;
    }

    if (requiresAddPreflight && (preflightLoading || preflight == null)) {
      return;
    }

    try {
      await requestMutation.mutate({
        cityTown: city,
        legDistrict: legDistrict === "" ? undefined : Number(legDistrict),
        electionDistrict: electionDistrict,
        addMemberId: requestAddMember?.VRCNUM,
        removeMemberId: requestRemoveMember?.VRCNUM,
        requestNotes: requestNotes,
        email: contactEmail.trim() || undefined,
        phone: contactPhone.trim() || undefined,
      });
    } catch {
      // onError handles user-visible failure state/toast.
    }
  };

  const removeMemberForm = (
    <div>
      {committeeList.length > 0 && (
        <div className="flex gap-4 items-center">
          <h2 className="py-2">
            Would you like to remove a member from the committee?
          </h2>
          <Switch
            checked={removeFormOpen}
            onCheckedChange={setRemoveFormOpen}
          />
        </div>
      )}
      {removeFormOpen && (
        <>
          {committeeList
            .filter((member) => member.VRCNUM !== requestRemoveMember?.VRCNUM)
            .map((member) => (
              <div key={member.VRCNUM} className="flex gap-4 items-center py-1">
                <p>
                  {member.firstName} {member.lastName}
                </p>
                <Button onClick={() => setRequestRemoveMember(member)}>
                  Remove from committee
                </Button>
              </div>
            ))}
        </>
      )}
    </div>
  );

  const addMemberForm = (
    <div>
      <div className="flex gap-4 items-center">
        <h2 className="py-2">
          Would you like to add someone to the committee?
        </h2>
        <Switch
          checked={addMemberFormOpen}
          onCheckedChange={(checked) => {
            if (checked) {
              setAddFormRecords([]);
            }

            setAddMemberFormOpen(checked);
          }}
        />
      </div>
      {addMemberFormOpen && (
        <>
          <RecordSearchForm
            handleResults={setAddFormRecords}
            submitButtonText="Find Members to Add"
          />
          <VoterRecordTable
            records={addFormRecords.slice(0, 4)}
            paginated={false}
            fieldsList={[]}
            extraContent={(record) => {
              const member = committeeList.find(
                (existingMember) => existingMember.VRCNUM === record.VRCNUM,
              );

              const getMessage = () => {
                if (member) {
                  return "Already in this committee";
                } else if (committeeList.length >= maxSeatsPerLted) {
                  return "Committee Full";
                } else {
                  return "Select Candidate";
                }
              };
              return (
                <div className="flex gap-4">
                  <Button
                    onClick={() => setRequestAddMember(record)}
                    disabled={!!member || committeeList.length >= maxSeatsPerLted}
                  >
                    {getMessage()}
                  </Button>
                </div>
              );
            }}
          />
        </>
      )}
    </div>
  );

  return (
    <Dialog defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-fit min-w-1/2">
        <DialogHeader>
          <DialogTitle>Committee Change Request</DialogTitle>
          <h1 className="pt-2">City: {city}</h1>
          {legDistrict !== "" && <h1>Leg District: {legDistrict}</h1>}
          <h1>Election District: {electionDistrict}</h1>
          {requestAddMember && (
            <p>
              Adding to the committee: {requestAddMember.firstName}{" "}
              {requestAddMember.lastName}
            </p>
          )}
          {requestRemoveMember && (
            <p>
              Removing from the committee: {requestRemoveMember.firstName}{" "}
              {requestRemoveMember.lastName}
            </p>
          )}

          {!requestAddMember && addMemberForm}
          {!requestRemoveMember && removeMemberForm}
        </DialogHeader>
        <div>
          <div className="max-w-[85vw] space-y-4">
            {requestAddMember && (
              <EligibilitySnapshotPanel
                preflight={preflight}
                loading={preflightLoading}
                error={preflightError}
              />
            )}
            {submissionFailureMessages != null && (
              <Alert variant="destructive">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <AlertTitle>Submission blocked</AlertTitle>
                    <AlertDescription>
                      <ul className="list-inside list-disc space-y-1">
                        {submissionFailureMessages.map((message, index) => (
                          <li key={`${message}-${index}`}>{message}</li>
                        ))}
                      </ul>
                      <p className="mt-2">{ELIGIBILITY_ESCALATION_MESSAGE}</p>
                    </AlertDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1"
                    onClick={() => setSubmissionFailureMessages(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </Alert>
            )}
            <div>
              <label>Notes about this request:</label>
              <Textarea onChange={(e) => setRequestNotes(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2 max-w-sm">
              <Label className="text-sm font-medium">
                Contact info for this submission (optional)
              </Label>
              <Input
                type="email"
                placeholder="Email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                aria-label="Contact email for submission"
              />
              <Input
                type="tel"
                placeholder="Phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                aria-label="Contact phone for submission"
              />
            </div>
          </div>
          {requestRemoveMember && !requestAddMember && (
            <p className="text-sm text-muted-foreground py-2">
              To remove a member without replacement, contact your administrator.
            </p>
          )}
          <Button
            type="button"
            className="w-full max-w-[85vw]"
            onClick={(e) => handleSubmit(e)}
            aria-busy={requestMutation.loading}
            aria-disabled={isSubmitBlocked}
            disabled={isSubmitBlocked}
          >
            {requestMutation.loading ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommitteeRequestForm;
