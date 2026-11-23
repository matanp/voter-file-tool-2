"use client";

import React from "react";
import { Card, CardContent } from "~/components/ui/card";
import { StatusBadge, type StatusTone } from "~/components/ui/status-badge";

// NOTE: This block must be preserved in future table-based CommitteeSelector redesign (see SRS_UI_PLANNING_GAPS §15)

export interface CommitteeSummaryBlockProps {
  vacancyCount: number;
  totalSeats: number;
  designationWeight: number | null;
  missingWeightSeatNumbers?: number[];
}

function getVacancyBadge(
  vacancyCount: number,
  totalSeats: number,
): { text: string; tone: StatusTone } {
  if (vacancyCount === 0) {
    return { text: "Full", tone: "success" };
  }
  if (vacancyCount === totalSeats) {
    return { text: `All ${totalSeats} seats vacant`, tone: "danger" };
  }
  if (vacancyCount === 1) {
    return { text: "1 open seat", tone: "warning" };
  }
  return { text: `${vacancyCount} open seats`, tone: "warning" };
}

/**
 * Compact summary block showing vacancy status, designation weight, and seat count.
 * Placed between district selectors and member list in CommitteeSelector.
 */
export function CommitteeSummaryBlock({
  vacancyCount,
  totalSeats,
  designationWeight,
  missingWeightSeatNumbers = [],
}: CommitteeSummaryBlockProps) {
  const vacancyBadge = getVacancyBadge(vacancyCount, totalSeats);
  const occupiedCount = totalSeats - vacancyCount;

  const showWeightDash =
    designationWeight === null ||
    missingWeightSeatNumbers.length > 0;
  const weightDisplay = showWeightDash
    ? "—"
    : designationWeight.toFixed(2);
  const weightTitle =
    missingWeightSeatNumbers.length > 0
      ? `Weight unavailable for seats ${missingWeightSeatNumbers.join(", ")}`
      : undefined;

  return (
    <Card className="p-4">
      <CardContent className="flex flex-wrap gap-6 p-0">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Vacancy</span>
          <StatusBadge tone={vacancyBadge.tone} className="text-sm">
            {vacancyBadge.text}
          </StatusBadge>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">
            Designation Weight
          </span>
          <span
            className="font-semibold text-lg"
            {...(weightTitle ? { title: weightTitle } : {})}
          >
            {weightDisplay}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Seats</span>
          <span className="font-semibold text-lg">
            {occupiedCount} of {totalSeats} seats filled
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
