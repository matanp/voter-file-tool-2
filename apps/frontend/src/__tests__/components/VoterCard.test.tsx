/**
 * VoterCard membership type badge: shown whenever a committee member's
 * membership type is passed. Callers decide whether to pass it (the legacy
 * CommitteeSelector withholds it while SHOW_MEMBERSHIP_TYPE is off).
 */
import React from "react";
import { render, screen } from "@testing-library/react";

import { VoterCard } from "~/app/recordsearch/VoterCard";
import { createMockVoterRecord } from "../utils/testUtils";

describe("VoterCard", () => {
  it("shows the membership type badge for a committee member", () => {
    render(
      <VoterCard
        record={createMockVoterRecord()}
        committee
        membershipType="APPOINTED"
      />,
    );
    expect(screen.getByText("Appointed")).toBeInTheDocument();
    expect(screen.queryByText("Petitioned")).not.toBeInTheDocument();
  });

  it("hides the membership type badge when none is passed", () => {
    render(
      <VoterCard
        record={createMockVoterRecord()}
        committee
        membershipType={null}
      />,
    );
    expect(screen.queryByText("Appointed")).not.toBeInTheDocument();
    expect(screen.queryByText("Petitioned")).not.toBeInTheDocument();
  });

  it("shows the election district", () => {
    render(
      <VoterCard record={createMockVoterRecord({ electionDistrict: 7 })} />,
    );
    expect(
      screen.getByText("Election District:").parentElement,
    ).toHaveTextContent("Election District: 7");
  });

  it("shows a dash when the election district is missing", () => {
    render(
      <VoterCard record={createMockVoterRecord({ electionDistrict: null })} />,
    );
    expect(
      screen.getByText("Election District:").parentElement,
    ).toHaveTextContent("Election District: -");
  });

  it("shows the town name and code from townCode, not the village code", () => {
    render(
      <VoterCard
        record={createMockVoterRecord({
          townCode: "095",
          CC_WD_Village: "00",
        })}
      />,
    );
    expect(screen.getByText("Town:").parentElement).toHaveTextContent(
      "Town: WEBSTER (095)",
    );
    expect(screen.queryByText("Village / Ward:")).not.toBeInTheDocument();
  });

  it("shows the village or ward when the voter is in one", () => {
    render(
      <VoterCard
        record={createMockVoterRecord({
          townCode: "095",
          CC_WD_Village: "WE",
        })}
      />,
    );
    expect(screen.getByText("Village / Ward:").parentElement).toHaveTextContent(
      "Village / Ward: WE",
    );
  });

  it("shows an unknown town code as-is and a dash when missing", () => {
    const { unmount } = render(
      <VoterCard record={createMockVoterRecord({ townCode: "999" })} />,
    );
    expect(screen.getByText("Town:").parentElement).toHaveTextContent(
      "Town: 999",
    );
    unmount();
    render(<VoterCard record={createMockVoterRecord({ townCode: null })} />);
    expect(screen.getByText("Town:").parentElement).toHaveTextContent(
      "Town: -",
    );
  });
});
