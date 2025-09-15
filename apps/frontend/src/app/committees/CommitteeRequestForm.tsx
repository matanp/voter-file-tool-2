import type { VoterRecord } from "@prisma/client";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import RecordSearchForm from "../components/RecordSearchForm";
import { Switch } from "~/components/ui/switch";
import { toast } from "~/components/ui/use-toast";
import { VoterRecordTable } from "../recordsearch/VoterRecordTable";
import { useApiMutation } from "~/hooks/useApiMutation";
import type { CommitteeRequest } from "@prisma/client";

type CommitteeRequestFormProps = {
  city: string;
  legDistrict: string;
  electionDistrict: number;
  defaultOpen: boolean;
  onOpenChange: (open: boolean) => void;
  committeeList: VoterRecord[];
  onSubmit: () => void;
  addMember?: VoterRecord;
  removeMember?: VoterRecord;
};

export const CommitteeRequestForm: React.FC<CommitteeRequestFormProps> = ({
  city,
  legDistrict,
  electionDistrict,
  defaultOpen,
  onOpenChange,
  committeeList,
  onSubmit,
  addMember,
  removeMember,
}) => {
  const [requestNotes, setRequestNotes] = useState<string>("");
  const [removeFormOpen, setRemoveFormOpen] = useState<boolean>(false);
  const [requestAddMember, setRequestAddMember] = useState<VoterRecord | null>(
    addMember ?? null,
  );
  const [requestRemoveMember, setRequestRemoveMember] =
    useState<VoterRecord | null>(removeMember ?? null);
  const [addFormRecords, setAddFormRecords] = useState<VoterRecord[]>([]);
  const [addMemberFormOpen, setAddMemberFormOpen] = useState<boolean>(false);

  // API mutation hook
  const requestMutation = useApiMutation<
    CommitteeRequest,
    {
      cityTown: string;
      legDistrict: string;
      electionDistrict: number;
      addMemberId?: string | null;
      removeMemberId?: string | null;
      requestNotes: string;
    }
  >("/api/committee/requestAdd", "POST", {
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Submitted your request for approval",
      });
      onSubmit();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong with your request",
      });
    },
  });

  const handleSubmit = async (
    _event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    await requestMutation.mutate({
      cityTown: city,
      legDistrict: legDistrict === "" ? "-1" : legDistrict,
      electionDistrict: electionDistrict,
      addMemberId: requestAddMember?.VRCNUM,
      removeMemberId: requestRemoveMember?.VRCNUM,
      requestNotes: requestNotes,
    });
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
                <p className="">
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
          {
            <VoterRecordTable
              records={addFormRecords.slice(0, 4)}
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
                    <div className="flex gap-4">
                      <Button
                        onClick={() => setRequestAddMember(record)}
                        disabled={
                          !!member ||
                          committeeList.length >= 4 ||
                          !!record.committeeId
                        }
                      >
                        {getMessage()}
                      </Button>
                    </div>
                  </>
                );
              }}
            />
          }
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
          <div className="max-w-[85vw]">
            <label>Notes about this request:</label>
            <Textarea onChange={(e) => setRequestNotes(e.target.value)} />
          </div>
          <Button
            className="w-full max-w-[85vw]"
            onClick={(e) => handleSubmit(e)}
            disabled={requestMutation.loading}
          >
            {requestMutation.loading ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommitteeRequestForm;
