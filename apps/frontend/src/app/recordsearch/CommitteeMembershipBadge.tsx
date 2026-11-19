import React from "react";

import { badgeVariants } from "~/components/ui/badge";
import { committeeLabelParts } from "~/lib/committees/committeeRef";
import { cn } from "~/lib/utils";
import {
  recordSearchCommitteeSpokenLabel,
  type RecordSearchCommittee,
} from "~/lib/recordSearch";

/**
 * "Committee: GREECE · LD 1 · ED 5" on a record search result whose voter is an
 * ACTIVE committee member (ticket 08). The server sends the committee only to
 * callers who may see its roster; the page hides it for acting roles below
 * Leader. A span, so it can sit inside the phone layout's card button.
 * Screen readers get the spelled-out label instead of the abbreviations.
 */
export function CommitteeMembershipBadge({
  committee,
  className,
}: {
  committee: RecordSearchCommittee;
  className?: string;
}) {
  // Each part stays whole, so a narrow column wraps only between parts.
  const parts = ["Committee:", ...committeeLabelParts(committee)];
  return (
    <span
      className={cn(
        badgeVariants({ variant: "secondary", hoverable: false }),
        "flex-wrap gap-x-1 rounded-md font-medium",
        className,
      )}
    >
      {parts.map((part, i) => (
        <span key={i} aria-hidden="true" className="whitespace-nowrap">
          {i > 0 && i < parts.length - 1 ? `${part} ·` : part}
        </span>
      ))}
      <span className="sr-only">
        {recordSearchCommitteeSpokenLabel(committee)}
      </span>
    </span>
  );
}
