import { PrivilegeLevel, type VoterRecord } from "@prisma/client";
import { useContext, useState } from "react";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { useToast } from "~/components/ui/use-toast";
import { hasPermissionFor } from "~/lib/utils";
import RecordSearchForm from "../components/RecordSearchForm";
import { VoterRecordTable } from "../recordsearch/VoterRecordTable";
import { Button } from "~/components/ui/button";
import CommitteeRequestForm from "./CommitteeRequestForm";

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

  const validCommittee =
    ((city !== "ROCHESTER" && legDistrict === "") ||
      (city === "ROCHESTER" && legDistrict !== "")) &&
    electionDistrict !== -1 &&
    city !== "";

  const handleAddCommitteeMember = async (
    event: React.FormEvent<HTMLButtonElement>,
    record: VoterRecord,
  ) => {
    event.preventDefault();

    if (hasPermissionFor(actingPermissions, PrivilegeLevel.Admin)) {
      const response = await fetch(`/api/committee/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cityTown: city,
          legDistrict: legDistrict === "" ? "-1" : legDistrict,
          electionDistrict: electionDistrict,
          memberId: record.VRCNUM,
        }),
      });

      if (response.ok) {
        onAdd(city, electionDistrict, legDistrict);
        toast({
          title: "Success",
          description: `Added ${record.firstName} ${record.lastName} to committee`,
        });
      } else {
        toast({
          title: "Error",
          description: "Something went wrong with your request",
        });
      }
    } else {
      setShowConfirm(true);
      setRequestedRecord(record);
    }
  };

  if (actingPermissions === PrivilegeLevel.ReadAccess) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <RecordSearchForm
          handleResults={(results) => {
            setRecords(results);
            setHasSearched(true);
          }}
          submitButtonText="Find Members to Add"
        />
        {records.length > 0 && (
          <VoterRecordTable
            records={records}
            paginated={false}
            fieldsList={[]}
            extraContent={(record: VoterRecord) => {
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
                      !!record.committeeId
                    }
                  >
                    {getMessage()}
                  </Button>
                </>
              );
            }}
          />
        )}
        {records.length === 0 && hasSearched && <p>No results found.</p>}
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
