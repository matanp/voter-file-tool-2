import {
  type MembershipType,
  PrivilegeLevel,
  type VoterRecord,
} from "@prisma/client";
import { useContext, useState } from "react";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { useToast } from "~/components/ui/use-toast";
import { hasPermissionFor } from "~/lib/utils";
import RecordSearchForm from "../components/RecordSearchForm";
import { VoterRecordTable } from "../recordsearch/VoterRecordTable";
import { Button } from "~/components/ui/button";
import CommitteeRequestForm from "./CommitteeRequestForm";
import { useApiMutation } from "~/hooks/useApiMutation";
import {
  type AddCommitteeResponse,
  type CommitteeData,
} from "~/lib/validations/committee";
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

interface AddCommitteeFormProps {
  electionDistrict: number;
  city: string;
  legDistrict: string;
  committeeList: VoterRecord[];
  maxSeatsPerLted?: number;
  onAdd: (city: string, district: number, legDistrict?: string) => void;
}

export const AddCommitteeForm: React.FC<AddCommitteeFormProps> = ({
  electionDistrict,
  city,
  legDistrict,
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

  // API mutation hook
  const addCommitteeMemberMutation = useApiMutation<
    AddCommitteeResponse,
    CommitteeData
  >("/api/committee/add", "POST", {
    onSuccess: (res) => {
      setLoadingVRCNUM(null); // Clear loading state
      if (res?.success) {
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
      setLoadingVRCNUM(null); // Clear loading state
      toast({
        title: "Error",
        description: `Failed to add committee member: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const validCommittee =
    city !== "" && legDistrict !== "" && electionDistrict > 0;

  const handleAddCommitteeMember = async (record: VoterRecord) => {
    if (hasPermissionFor(actingPermissions, PrivilegeLevel.Admin)) {
      setLoadingVRCNUM(record.VRCNUM); // Set loading state for this specific record
      await addCommitteeMemberMutation.mutate({
        cityTown: city,
        ...(legDistrict !== "" && { legDistrict: parseInt(legDistrict, 10) }),
        electionDistrict: electionDistrict,
        memberId: record.VRCNUM,
        membershipType,
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

  const isAdmin = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);

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
          <RecordSearchForm
            handleResults={(results) => {
              setRecords(results);
              setHasSearched(true);
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
            <VoterRecordTable
              records={records.slice(0, 5)}
              paginated={false}
              fieldsList={[]}
              extraContent={(record) => {
                const member = committeeList.find(
                  (member) => member.VRCNUM === record.VRCNUM,
                );

                const getMessage = () => {
                  if (member) {
                    return "Already in this committee";
                  } else if (committeeList.length >= maxSeatsPerLted) {
                    return "Committee Full";
                  } else {
                    return "Add to Committee";
                  }
                };

                return (
                  <>
                    <Button
                      onClick={() => handleAddCommitteeMember(record)}
                      disabled={
                        !!member ||
                        committeeList.length >= maxSeatsPerLted ||
                        !validCommittee ||
                        loadingVRCNUM === record.VRCNUM
                      }
                    >
                      {loadingVRCNUM === record.VRCNUM
                        ? "Adding..."
                        : getMessage()}
                    </Button>
                  </>
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
