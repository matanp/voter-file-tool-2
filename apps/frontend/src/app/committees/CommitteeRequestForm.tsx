import { type VoterRecordAPI } from "@voter-file-tool/shared-validators";
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
import { useCommitteeMemberStatus } from "~/hooks/useCommitteeMemberStatus";
import type {
  CommitteeRequestData,
  CommitteeRequestResponse,
} from "~/lib/validations/committee";

type CommitteeRequestFormProps = {
  city: string;
  legDistrict: string;
  electionDistrict: number;
  defaultOpen: boolean;
  onOpenChange: (open: boolean) => void;
  committeeList: VoterRecordAPI[];
  onSubmit: () => void;
  addMember?: VoterRecordAPI;
  removeMember?: VoterRecordAPI;
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
  const [requestAddMember, setRequestAddMember] =
    useState<VoterRecordAPI | null>(addMember ?? null);
  const [requestRemoveMember, setRequestRemoveMember] =
    useState<VoterRecordAPI | null>(removeMember ?? null);
  const [addFormRecords, setAddFormRecords] = useState<VoterRecordAPI[]>([]);
  const [addMemberFormOpen, setAddMemberFormOpen] = useState<boolean>(false);

  // API mutation hook
  const requestMutation = useApiMutation<
    CommitteeRequestResponse,
    CommitteeRequestData
  >("/api/committee/requestAdd", "POST", {
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Submitted your request for approval",
      });
      onSubmit();
      setRequestNotes("");
      setRequestAddMember(null);
      setRequestRemoveMember(null);
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
      legDistrict: legDistrict === "" ? undefined : Number(legDistrict),
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
            handleResults={(results) => setAddFormRecords(results)}
            submitButtonText="Find Members to Add"
          />
          {
            <VoterRecordTable
              records={addFormRecords.slice(0, 4)}
              paginated={false}
              fieldsList={[]}
              extraContent={(record) => {
                const memberStatus = useCommitteeMemberStatus(
                  record,
                  committeeList,
                );

                return (
                  <>
                    <div className="flex gap-4">
                      <Button
                        onClick={() => setRequestAddMember(record)}
                        disabled={
                          !memberStatus.canAdd ||
                          committeeList.length >= 4 ||
                          !!record.committeeId
                        }
                      >
                        {memberStatus.message}
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
            type="button"
            className="w-full max-w-[85vw]"
            onClick={(e) => handleSubmit(e)}
            aria-busy={requestMutation.loading}
            aria-disabled={
              requestMutation.loading ||
              (!requestAddMember && !requestRemoveMember)
            }
            disabled={
              requestMutation.loading ||
              (!requestAddMember && !requestRemoveMember)
            }
          >
            {requestMutation.loading ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommitteeRequestForm;
