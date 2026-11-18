import React from "react";

import { badgeVariants } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import {
  recordSearchCommitteeLabel,
  type RecordSearchCommittee,
} from "~/lib/validations/recordSearch";

/**
 * "Committee: GREECE · LD 1 · ED 5" on a record search result whose voter is an
 * ACTIVE committee member (ticket 08). The server sends the committee only to
 * callers who may see its roster; the page hides it for acting roles below
 * Leader. A span, so it can sit inside the phone layout's card button.
 */
export function CommitteeMembershipBadge({
  committee,
  className,
}: {
  committee: RecordSearchCommittee;
  className?: string;
}) {
  return (
    <span
      className={cn(
        badgeVariants({ variant: "secondary", hoverable: false }),
        "whitespace-normal font-medium",
        className,
      )}
    >
      {`Committee: ${recordSearchCommitteeLabel(committee)}`}
    </span>
  );
}
