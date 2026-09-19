import { Info } from "lucide-react";
import { Label } from "~/components/ui/label";

/**
 * Label for the SRS 2.1a member contact inputs on the add/request forms.
 * The info icon clarifies these belong to the *member being added*, not the
 * submitter — stored on CommitteeMembership.submissionMetadata, never on
 * VoterRecord (see docs/SRS/SRS_GAPS_AND_CONSIDERATIONS.md §2.1a).
 */
export default function ContactInfoLabel({
  memberName,
}: {
  /** When known, names the member so the fields read as theirs. */
  memberName?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-sm font-medium">
        {memberName
          ? `Contact info for ${memberName} (optional)`
          : "Member's contact info (optional)"}
      </Label>
      <span className="group relative inline-flex">
        <button
          type="button"
          className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
          aria-label="About member contact info"
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 w-64 -translate-x-1/2 rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-md opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          Email and phone for the person you&apos;re adding, so committee
          rosters and sign-in sheets can reach them. This is kept with the
          committee submission and does not change their voter record.
        </span>
      </span>
    </div>
  );
}
