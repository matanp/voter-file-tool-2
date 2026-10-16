/**
 * VoterCard membership type badge: hidden while SHOW_MEMBERSHIP_TYPE is off,
 * even for a committee member whose membership type is known.
 */
import React from "react";
import { render, screen } from "@testing-library/react";

import { VoterCard } from "~/app/recordsearch/RecordsList";
import { createMockVoterRecord } from "../utils/testUtils";

// next-auth/react (imported by RecordsList) is ESM-only and not transformed under jest.
jest.mock("next-auth/react", () => ({ useSession: jest.fn() }));

describe("VoterCard", () => {
  it("hides the membership type badge for now", () => {
    render(
      <VoterCard
        record={createMockVoterRecord()}
        committee
        membershipType="APPOINTED"
      />,
    );
    expect(screen.queryByText("Appointed")).not.toBeInTheDocument();
    expect(screen.queryByText("Petitioned")).not.toBeInTheDocument();
  });
});
