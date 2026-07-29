import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  ELIGIBILITY_ESCALATION_MESSAGE,
  getIneligibilityMessage,
} from "~/lib/eligibilityMessages";
import type { EligibilityPreflightResponse } from "~/lib/eligibilityPreflight";

type EligibilitySnapshotPanelProps = {
  preflight: EligibilityPreflightResponse | null;
  loading: boolean;
  error: string | null;
};

function renderValue(
  value: string | number | null | undefined,
): string | number {
  if (value == null || value === "") {
    return "N/A";
  }
  return value;
}

export default function EligibilitySnapshotPanel({
  preflight,
  loading,
  error,
}: EligibilitySnapshotPanelProps) {
  if (loading) {
    return (
      <Alert>
        <AlertTitle>Eligibility Snapshot</AlertTitle>
        <AlertDescription>Checking eligibility preflight...</AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Eligibility Snapshot Unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!preflight) {
    return null;
  }

  const { snapshot, hardStops, warnings } = preflight;
  const hasHardStops = hardStops.length > 0;
  const hasWarnings = warnings.length > 0;

  return (
    <div className="rounded-md border bg-muted/30 p-4 text-sm">
      <div className="flex flex-col gap-1">
        <p className="font-medium">Eligibility Snapshot</p>
        <p className="text-muted-foreground">
          Warning state:{" "}
          {snapshot.warningState === "HAS_WARNINGS" ? "Warnings present" : "Clear"}
        </p>
      </div>

      <div className="mt-3 grid gap-1 md:grid-cols-2">
        <p>
          <span className="font-medium">Voter:</span>{" "}
          {renderValue(snapshot.voter.name)}
        </p>
        <p>
          <span className="font-medium">Voter ID:</span>{" "}
          {renderValue(snapshot.voter.voterRecordId)}
        </p>
        <p>
          <span className="font-medium">Home city/town:</span>{" "}
          {renderValue(snapshot.voter.homeCityTown)}
        </p>
        <p>
          <span className="font-medium">Home ED:</span>{" "}
          {renderValue(snapshot.voter.homeElectionDistrict)}
        </p>
        <p>
          <span className="font-medium">Assembly District:</span>{" "}
          {renderValue(snapshot.voter.homeAssemblyDistrict)}
        </p>
        <p>
          <span className="font-medium">Party:</span>{" "}
          {renderValue(snapshot.voter.party)}
        </p>
        <p>
          <span className="font-medium">LTED:</span>{" "}
          {snapshot.lted.cityTown} / LD {snapshot.lted.legDistrict} / ED{" "}
          {snapshot.lted.electionDistrict}
        </p>
        <p>
          <span className="font-medium">Committee seats:</span>{" "}
          {snapshot.committee.activeMemberCount}/{snapshot.committee.maxSeatsPerLted}
        </p>
      </div>

      {hasHardStops && (
        <Alert variant="destructive" className="mt-3">
          <AlertTitle>Submission blocked</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc space-y-1">
              {hardStops.map((reason) => (
                <li key={reason}>{getIneligibilityMessage(reason)}</li>
              ))}
            </ul>
            <p className="mt-2">{ELIGIBILITY_ESCALATION_MESSAGE}</p>
          </AlertDescription>
        </Alert>
      )}

      {hasWarnings && (
        <Alert variant="warning" className="mt-3">
          <AlertTitle>Non-blocking warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc space-y-1">
              {warnings.map((warning) => (
                <li key={warning.code}>{warning.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
