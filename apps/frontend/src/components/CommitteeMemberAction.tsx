import { type VoterRecordAPI } from "@voter-file-tool/shared-validators";
import { Button } from "~/components/ui/button";
import { useCommitteeMemberStatus } from "~/hooks/useCommitteeMemberStatus";

interface CommitteeMemberActionProps {
  record: VoterRecordAPI;
  committeeList: VoterRecordAPI[];
  onAdd: (record: VoterRecordAPI) => void;
  disabled?: boolean;
  loading?: boolean;
}

// Component to handle committee member status and action button
export const CommitteeMemberAction: React.FC<CommitteeMemberActionProps> = ({
  record,
  committeeList,
  onAdd,
  disabled = false,
  loading = false,
}) => {
  const memberStatus = useCommitteeMemberStatus(record, committeeList);

  return (
    <Button
      onClick={() => onAdd(record)}
      disabled={
        disabled || !memberStatus.canAdd || !!record.committeeId || loading
      }
    >
      {loading ? "Adding..." : memberStatus.message}
    </Button>
  );
};
