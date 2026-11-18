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
  // Each part stays whole, so a narrow column wraps only between parts.
  const parts = [
    "Committee:",
    ...recordSearchCommitteeLabel(committee).split(" · "),
  ];
  return (
    <span
      className={cn(
        badgeVariants({ variant: "secondary", hoverable: false }),
        "flex-wrap gap-x-1 rounded-md font-medium",
        className,
      )}
    >
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {/* Not rendered between flex items; keeps the text readable as one line. */}
          {i > 0 && " "}
          <span className="whitespace-nowrap">
            {i > 0 && i < parts.length - 1 ? `${part} ·` : part}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}
