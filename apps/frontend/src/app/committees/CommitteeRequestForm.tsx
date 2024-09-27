import { VoterRecord } from "@prisma/client";
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

  const handleSubmit = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    event.preventDefault();

    const response = await fetch(`/api/committee/requestAdd`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cityTown: city,
        legDistrict: legDistrict === "" ? "-1" : legDistrict,
        electionDistrict: electionDistrict,
        addMemberId: requestAddMember?.VRCNUM,
        removeMemberId: requestRemoveMember?.VRCNUM,
        requestNotes: requestNotes,
      }),
    });

    if (response.ok) {
      toast({
        title: "Success",
        description: "Submitted your request for approval",
      });
    } else {
      toast({
        title: "Error",
        description: "Something went wrong with your request",
      });
    }

    onSubmit();
  };

  const removeMemberForm = (
    <div>
      <div className="flex gap-2 items-center">
        <h2 className="py-2">
          Would you like to remove a member from the committee?
        </h2>
        <Switch checked={removeFormOpen} onCheckedChange={setRemoveFormOpen} />
      </div>
      {removeFormOpen && (
        <>
          {committeeList
            .filter((member) => member.VRCNUM !== requestRemoveMember?.VRCNUM)
            .map((member) => (
              <div key={member.VRCNUM} className="flex gap-2 items-center py-1">
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
      <div className="flex gap-2 items-center">
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
          <RecordSearchForm handleResults={setAddFormRecords} />
          {addFormRecords
            .filter(
              (member) =>
                committeeList.find((m) => m.VRCNUM === member.VRCNUM) ===
                undefined,
            )
            .slice(0, 4)
            .map((member) => (
              <div key={member.VRCNUM} className="flex gap-2 items-center py-1">
                <p className="">
                  {member.firstName} {member.lastName}
                </p>
                <Button onClick={() => setRequestAddMember(member)}>
                  Add to committee
                </Button>
              </div>
            ))}
        </>
      )}
    </div>
  );

  return (
    <Dialog defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <DialogContent>
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
          <label>Notes about this request:</label>
          <Textarea onChange={(e) => setRequestNotes(e.target.value)} />
        </div>
        <Button onClick={(e) => handleSubmit(e)}>Submit Request</Button>
      </DialogContent>
    </Dialog>
  );
};

export default CommitteeRequestForm;
