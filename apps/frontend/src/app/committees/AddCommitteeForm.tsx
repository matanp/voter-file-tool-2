import {
  type MembershipType,
  PrivilegeLevel,
  type VoterRecord,
} from "@prisma/client";
import { useContext, useEffect, useState } from "react";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { useToast } from "~/components/ui/use-toast";
import { hasPermissionFor } from "~/lib/utils";
import RecordSearchForm from "../components/RecordSearchForm";
import { VoterRecordTable } from "../recordsearch/VoterRecordTable";
import { Button } from "~/components/ui/button";
import CommitteeRequestForm from "./CommitteeRequestForm";
import EligibilitySnapshotPanel from "./EligibilitySnapshotPanel";
import { useApiMutation } from "~/hooks/useApiMutation";
import {
  type AddCommitteeResponse,
  type CommitteeData,
} from "~/lib/validations/committee";
import {
  ELIGIBILITY_ESCALATION_MESSAGE,
  getIneligibilityMessages,
} from "~/lib/eligibilityMessages";
import type { EligibilityWarning } from "~/lib/eligibility";
import type { EligibilityPreflightResponse } from "~/lib/eligibilityPreflight";
import {
  type SearchQueryField,
  searchableFieldEnum,
} from "@voter-file-tool/shared-validators";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

interface AddCommitteeFormProps {
  electionDistrict: number;
  city: string;
  legDistrict: string;
  committeeListId?: number | null;
  committeeList: VoterRecord[];
  maxSeatsPerLted?: number;
  onAdd: (city: string, district: number, legDistrict?: string) => void;
}

export const AddCommitteeForm: React.FC<AddCommitteeFormProps> = ({
  electionDistrict,
  city,
  legDistrict,
  committeeListId = null,
  committeeList,
  maxSeatsPerLted = 4,
  onAdd,
}) => {
  const { toast } = useToast();
  const { actingPermissions } = useContext(GlobalContext);
  const [records, setRecords] = useState<VoterRecord[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [requestedRecord, setRequestedRecord] = useState<VoterRecord | null>(
    null,
  );
  const [loadingVRCNUM, setLoadingVRCNUM] = useState<string | null>(null);
  const [membershipType, setMembershipType] =
    useState<MembershipType>("APPOINTED");
  const [ineligibilityReasons, setIneligibilityReasons] = useState<string[] | null>(
    null,
  );
  /** SRS §2.2 — Server-returned warnings only; frontend does not duplicate checks. */
  const [warnings, setWarnings] = useState<EligibilityWarning[] | null>(null);
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<VoterRecord | null>(null);
  const [preflightLoading, setPreflightLoading] = useState<boolean>(false);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<EligibilityPreflightResponse | null>(
    null,
  );
  const [preflightRefreshKey, setPreflightRefreshKey] = useState<number>(0);

  const isAdmin = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);
  const validCommittee =
    city !== "" && legDistrict !== "" && electionDistrict > 0;
  const buildBlockedSubmissionToastDescription = (messages: string[]): string =>
    `${messages.join(" ")} ${ELIGIBILITY_ESCALATION_MESSAGE}`;

  // API mutation hook
  const addCommitteeMemberMutation = useApiMutation<
    AddCommitteeResponse,
    CommitteeData
  >("/api/committee/add", "POST", {
    onSuccess: (res) => {
      setLoadingVRCNUM(null);
      setIneligibilityReasons(null);
      if (res?.success) {
        setWarnings("warnings" in res && res.warnings ? res.warnings : null);
        onAdd(city, electionDistrict, legDistrict);
        const isIdempotent = "idempotent" in res && res.idempotent;
        toast({
          title: "Success",
          description: isIdempotent
            ? "Member already connected to committee"
            : "Committee member added successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Request completed but was not successful.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      setLoadingVRCNUM(null);
      setWarnings(null);
      const apiBody = (
        error as Error & {
          apiErrorBody?: { error?: string; reasons?: string[] };
        }
      ).apiErrorBody;
      if (apiBody?.error === "INELIGIBLE") {
        const reasons = Array.isArray(apiBody.reasons) ? apiBody.reasons : [];
        const failureMessages = getIneligibilityMessages(reasons);
        setIneligibilityReasons(reasons);
        toast({
          title: "Submission blocked",
          description: buildBlockedSubmissionToastDescription(failureMessages),
          variant: "destructive",
        });
      } else {
        setIneligibilityReasons(null);
        toast({
          title: "Error",
          description: `Failed to add committee member: ${error.message}`,
          variant: "destructive",
        });
      }
    },
  });

  useEffect(() => {
    if (
      !isAdmin ||
      !validCommittee ||
      selectedRecord == null ||
      committeeListId == null
    ) {
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
      voterRecordId: selectedRecord.VRCNUM,
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
        setIneligibilityReasons(data.hardStops.length > 0 ? data.hardStops : null);
        setWarnings(data.warnings.length > 0 ? data.warnings : null);
      })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Failed to check eligibility";
        setPreflightError(message);
        setIneligibilityReasons(null);
        setWarnings(null);
      })
      .finally(() => {
        setPreflightLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [
    isAdmin,
    validCommittee,
    selectedRecord,
    selectedRecord?.VRCNUM,
    committeeListId,
    city,
    legDistrict,
    electionDistrict,
    preflightRefreshKey,
  ]);

  useEffect(() => {
    setIneligibilityReasons(null);
  }, [selectedRecord?.VRCNUM, membershipType, contactEmail, contactPhone]);

  const handleAddCommitteeMember = async (record: VoterRecord) => {
    setIneligibilityReasons(null);
    setWarnings(null);
    if (isAdmin) {
      if (committeeListId == null) {
        toast({
          title: "Error",
          description: "Select a valid committee before adding a member.",
          variant: "destructive",
        });
        return;
      }

      if (selectedRecord?.VRCNUM !== record.VRCNUM) {
        setSelectedRecord(record);
        return;
      }

      if (preflightError) {
        setPreflightRefreshKey((prev) => prev + 1);
        return;
      }

      if (preflightLoading || preflight == null) {
        return;
      }

      if (preflight.hardStops.length > 0) {
        setIneligibilityReasons(preflight.hardStops);
        return;
      }

      setLoadingVRCNUM(record.VRCNUM);
      await addCommitteeMemberMutation.mutate({
        cityTown: city,
        ...(legDistrict !== "" && { legDistrict: parseInt(legDistrict, 10) }),
        electionDistrict: electionDistrict,
        memberId: record.VRCNUM,
        membershipType,
        email: contactEmail.trim() || undefined,
        phone: contactPhone.trim() || undefined,
      });
    } else {
      setShowConfirm(true);
      setRequestedRecord(record);
    }
  };

  if (actingPermissions === PrivilegeLevel.ReadAccess) {
    return null;
  }

  const extraSearchQuery: SearchQueryField[] = [
    { field: searchableFieldEnum.enum.city, values: [city] },
    ...(legDistrict
      ? [{ field: searchableFieldEnum.enum.L_T, values: [legDistrict] }]
      : []),
    {
      field: searchableFieldEnum.enum.electionDistrict,
      values: [electionDistrict],
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-4">
        {validCommittee && isAdmin && (
          <div className="flex flex-col gap-2 max-w-xs">
            <label
              htmlFor="membership-type-select"
              className="text-sm font-medium"
            >
              Membership Type
            </label>
            <Select
              value={membershipType}
              onValueChange={(val) => setMembershipType(val as MembershipType)}
            >
              <SelectTrigger id="membership-type-select">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPOINTED">Appointed</SelectItem>
                <SelectItem value="PETITIONED">Petitioned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {validCommittee && (
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
        )}
        {validCommittee && (
          <RecordSearchForm
            handleResults={(results) => {
              setRecords(results);
              setHasSearched(true);
              setSelectedRecord(null);
              setPreflight(null);
              setPreflightError(null);
              setPreflightLoading(false);
              setIneligibilityReasons(null);
              setWarnings(null);
            }}
            extraSearchQuery={extraSearchQuery}
            optionalExtraSearch="Only Eligible Candidates"
            submitButtonText="Find Members to Add"
            headerText="Add Committee Member"
          />
        )}
        {records.length > 0 && validCommittee && (
          <>
            <h1 className="primary-header">Search Results</h1>
            {isAdmin && selectedRecord != null && (
              <EligibilitySnapshotPanel
                preflight={preflight}
                loading={preflightLoading}
                error={preflightError}
              />
            )}
            {ineligibilityReasons != null && (
              <Alert variant="destructive">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <AlertTitle>Cannot add member</AlertTitle>
                    <AlertDescription>
                      <ul className="mt-1 list-inside list-disc space-y-1">
                        {getIneligibilityMessages(ineligibilityReasons).map(
                          (message, index) => (
                            <li key={`${message}-${index}`}>{message}</li>
                          ),
                        )}
                      </ul>
                      <p className="mt-2">{ELIGIBILITY_ESCALATION_MESSAGE}</p>
                    </AlertDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1"
                    onClick={() => setIneligibilityReasons(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </Alert>
            )}
            {warnings != null && warnings.length > 0 && (
              <Alert variant="warning" className="mt-2">
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                  <ul className="mt-1 list-inside list-disc">
                    {warnings.map((w) => (
                      <li key={w.code}>{w.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <VoterRecordTable
              records={records.slice(0, 5)}
              paginated={false}
              fieldsList={[]}
              extraContent={(record) => {
                const member = committeeList.find(
                  (existingMember) => existingMember.VRCNUM === record.VRCNUM,
                );
                const isSelected = selectedRecord?.VRCNUM === record.VRCNUM;
                const hasHardStops =
                  isSelected &&
                  (preflight?.hardStops.length ?? ineligibilityReasons?.length ?? 0) >
                    0;
                const checkingEligibility = isSelected && preflightLoading;
                const canSelectCandidate =
                  !member &&
                  committeeList.length < maxSeatsPerLted &&
                  validCommittee &&
                  loadingVRCNUM !== record.VRCNUM;

                const getMessage = () => {
                  if (member) {
                    return "Already in this committee";
                  } else if (committeeList.length >= maxSeatsPerLted) {
                    return "Committee Full";
                  } else if (!isAdmin) {
                    return "Add to Committee";
                  } else if (!isSelected) {
                    return "Select Candidate";
                  } else if (checkingEligibility) {
                    return "Checking...";
                  } else if (hasHardStops) {
                    return "Ineligible";
                  } else if (preflightError) {
                    return "Retry Check";
                  } else {
                    return "Add to Committee";
                  }
                };

                return (
                  <Button
                    onClick={() => handleAddCommitteeMember(record)}
                    disabled={
                      !canSelectCandidate ||
                      (isAdmin &&
                        isSelected &&
                        (checkingEligibility || hasHardStops))
                    }
                  >
                    {loadingVRCNUM === record.VRCNUM
                      ? "Adding..."
                      : getMessage()}
                  </Button>
                );
              }}
            />
          </>
        )}
        {records.length === 0 && hasSearched && (
          <>
            <h1 className="primary-header">Search Results</h1>
            <p>No results found.</p>
          </>
        )}
      </div>
      {showConfirm && requestedRecord !== null && (
        <CommitteeRequestForm
          city={city}
          legDistrict={legDistrict}
          electionDistrict={electionDistrict}
          committeeListId={committeeListId}
          defaultOpen={showConfirm}
          committeeList={committeeList}
          maxSeatsPerLted={maxSeatsPerLted}
          onOpenChange={(open) => setShowConfirm(open)}
          addMember={requestedRecord}
          onSubmit={() => setShowConfirm(false)}
        />
      )}
    </>
  );
};
