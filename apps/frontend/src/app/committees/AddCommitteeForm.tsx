import { PrivilegeLevel, type VoterRecord } from "@prisma/client";
import { useContext, useState } from "react";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { useToast } from "~/components/ui/use-toast";
import { hasPermissionFor } from "~/lib/utils";
import RecordSearchForm from "../components/RecordSearchForm";
import { VoterRecordTable } from "../recordsearch/VoterRecordTable";
import { Button } from "~/components/ui/button";
import CommitteeRequestForm from "./CommitteeRequestForm";
import { useApiMutation } from "~/hooks/useApiMutation";

interface AddCommitteeFormProps {
  electionDistrict: number;
  city: string;
  legDistrict: string;
  committeeList: VoterRecord[];
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
  const { actingPermissions } = useContext(GlobalContext);
  const [records, setRecords] = useState<VoterRecord[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [requestedRecord, setRequestedRecord] = useState<VoterRecord | null>(
    null,
  );

  // API mutation hook
  const addCommitteeMemberMutation = useApiMutation<
    { success: boolean },
    {
      cityTown: string;
      legDistrict: string;
      electionDistrict: number;
      memberId: string;
    }
  >("/api/committee/add", "POST", {
    onSuccess: () => {
      onAdd(city, electionDistrict, legDistrict);
      toast({
        title: "Success",
        description: "Committee member added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add committee member: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const validCommittee =
    city !== "" && legDistrict !== "" && electionDistrict !== -1;

  const handleAddCommitteeMember = async (
    event: React.FormEvent<HTMLButtonElement>,
    record: VoterRecord,
  ) => {
    event.preventDefault();

    if (hasPermissionFor(actingPermissions, PrivilegeLevel.Admin)) {
      await addCommitteeMemberMutation.mutate({
        cityTown: city,
        legDistrict: legDistrict === "" ? "-1" : legDistrict,
        electionDistrict: electionDistrict,
        memberId: record.VRCNUM,
      });
    } else {
      setShowConfirm(true);
      setRequestedRecord(record);
    }
  };

  if (actingPermissions === PrivilegeLevel.ReadAccess) {
    return null;
  }

  const extraSearchQuery = [
    { field: "city", value: city },
    { field: "L_T", value: legDistrict },
    { field: "electionDistrict", value: electionDistrict },
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
                const member = committeeList.find(
                  (member) => member.VRCNUM === record.VRCNUM,
                );

                const getMessage = () => {
                  if (member) {
                    return "Already in this committee";
                  } else if (!!record.committeeId) {
                    return "Already in a different committee";
                  } else if (committeeList.length >= 4) {
                    return "Committee Full";
                  } else {
                    return "Add to Committee";
                  }
                };

                return (
                  <>
                    <Button
                      onClick={(e) => handleAddCommitteeMember(e, record)}
                      disabled={
                        !!member ||
                        committeeList.length >= 4 ||
                        !validCommittee ||
                        !!record.committeeId ||
                        addCommitteeMemberMutation.loading
                      }
                    >
                      {addCommitteeMemberMutation.loading
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
          onOpenChange={(open) => setShowConfirm(open)}
          addMember={requestedRecord}
          onSubmit={() => setShowConfirm(false)}
        />
      )}
    </>
  );
};
