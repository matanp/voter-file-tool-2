import { PrivilegeLevel } from "@prisma/client";
import { type VoterRecordAPI } from "@voter-file-tool/shared-validators";
import { useContext, useState } from "react";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { useToast } from "~/components/ui/use-toast";
import { useCommitteePermissions } from "~/hooks/useCommitteePermissions";
import RecordSearchForm from "../components/RecordSearchForm";
import { VoterRecordTable } from "../recordsearch/VoterRecordTable";
import { Button } from "~/components/ui/button";
import CommitteeRequestForm from "./CommitteeRequestForm";
import { useApiMutation } from "~/hooks/useApiMutation";
import { useCommitteeMemberStatus } from "~/hooks/useCommitteeMemberStatus";
import {
  type AddCommitteeResponse,
  type CommitteeData,
} from "~/lib/validations/committee";
import {
  type SearchQueryField,
  searchableFieldEnum,
} from "@voter-file-tool/shared-validators";

interface AddCommitteeFormProps {
  electionDistrict: number;
  city: string;
  legDistrict: string;
  committeeList: VoterRecordAPI[];
  onAdd: (city: string, district: number, legDistrict?: string) => void;
}

export const AddCommitteeForm: React.FC<AddCommitteeFormProps> = ({
  electionDistrict,
  city,
  legDistrict,
  committeeList,
  onAdd,
}) => {
  const { toast } = useToast();
  const { isAdmin, canView } = useCommitteePermissions();
  const [records, setRecords] = useState<VoterRecordAPI[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [requestedRecord, setRequestedRecord] = useState<VoterRecordAPI | null>(
    null,
  );
  const [loadingVRCNUM, setLoadingVRCNUM] = useState<string | null>(null);

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

  const handleAddCommitteeMember = async (record: VoterRecordAPI) => {
    if (isAdmin) {
      setLoadingVRCNUM(record.VRCNUM); // Set loading state for this specific record
      await addCommitteeMemberMutation.mutate({
        cityTown: city,
        ...(legDistrict !== "" && { legDistrict: parseInt(legDistrict, 10) }),
        electionDistrict: electionDistrict,
        memberId: record.VRCNUM,
      });
    } else {
      setShowConfirm(true);
      setRequestedRecord(record);
    }
  };

  if (!canView) {
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
                const memberStatus = useCommitteeMemberStatus(
                  record,
                  committeeList,
                );

                return (
                  <>
                    <Button
                      onClick={() => handleAddCommitteeMember(record)}
                      disabled={
                        !memberStatus.canAdd ||
                        !validCommittee ||
                        !!record.committeeId ||
                        loadingVRCNUM === record.VRCNUM
                      }
                    >
                      {loadingVRCNUM === record.VRCNUM
                        ? "Adding..."
                        : memberStatus.message}
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
          onOpenChange={(open) => setShowConfirm(open)}
          addMember={requestedRecord}
          onSubmit={() => setShowConfirm(false)}
        />
      )}
    </>
  );
};
