/**
 * ui-makeover 03: status and type badges show human labels, never raw enums or DB type names,
 * and the five tones come from one StatusBadge.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PrivilegeLevel, ReportType } from "@prisma/client";
import { StatusBadge } from "~/components/ui/status-badge";
import { formatReportType } from "~/components/reports/reportUtils";
import { privilegeLabel } from "~/lib/invites/display";

describe("formatReportType", () => {
  it("labels every report type with a human name, not the enum", () => {
    for (const type of Object.values(ReportType)) {
      const label = formatReportType(type);
      expect(label).toBeTruthy();
      expect(label).not.toBe(type);
    }
  });

  it("calls CommitteeReport rows a Committee Roster, matching the Generate Report card", () => {
    expect(formatReportType(ReportType.CommitteeReport)).toBe("Committee Roster");
  });
});

describe("privilegeLabel", () => {
  it("spaces out multi-word privileges", () => {
    expect(privilegeLabel(PrivilegeLevel.RequestAccess)).toBe("Request Access");
    expect(privilegeLabel(PrivilegeLevel.ReadAccess)).toBe("Read Access");
    expect(privilegeLabel(PrivilegeLevel.Admin)).toBe("Admin");
  });
});

describe("StatusBadge", () => {
  it("renders the tone's soft pill classes", () => {
    render(<StatusBadge tone="warning">Pending</StatusBadge>);
    expect(screen.getByText("Pending")).toHaveClass(
      "bg-warning-bg",
      "text-warning-fg",
      "rounded-full",
    );
  });

  it("defaults to the neutral tone", () => {
    render(<StatusBadge>Leader</StatusBadge>);
    expect(screen.getByText("Leader")).toHaveClass("bg-muted");
  });

  it("shows a count before its label", () => {
    render(
      <StatusBadge tone="warning" count={2}>
        <span className="sr-only"> pending</span>
      </StatusBadge>,
    );
    expect(screen.getByText("2")).toHaveClass("tabular-nums");
  });
});
