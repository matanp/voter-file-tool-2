import { render, screen } from "@testing-library/react";

import EligibilitySnapshotPanel from "~/app/committees/EligibilitySnapshotPanel";
import { getIneligibilityMessage } from "~/lib/eligibilityMessages";
import type {
  EligibilityPreflightResponse,
  EligibilitySnapshot,
} from "~/lib/eligibilityPreflight";

const NO_CROSSWALK_MESSAGE = /committee's ED has no crosswalk entry/i;

function preflight({
  voter = {},
  lted = {},
  ...overrides
}: Partial<Omit<EligibilityPreflightResponse, "snapshot">> & {
  voter?: Partial<EligibilitySnapshot["voter"]>;
  lted?: Partial<EligibilitySnapshot["lted"]>;
} = {}): EligibilityPreflightResponse {
  return {
    eligible: true,
    hardStops: [],
    warnings: [],
    snapshot: {
      voter: {
        voterRecordId: "V-JANE",
        name: "Jane Doe",
        homeCityTown: "GREECE",
        homeElectionDistrict: 5,
        homeAssemblyDistrict: "134",
        party: "DEM",
        ...voter,
      },
      lted: {
        cityTown: "GREECE",
        legDistrict: 1,
        electionDistrict: 5,
        assemblyDistrict: "134",
        ...lted,
      },
      committee: { activeMemberCount: 1, maxSeatsPerLted: 4 },
      warningState: "NONE",
    },
    ...overrides,
  };
}

function renderPanel(response: EligibilityPreflightResponse) {
  return render(
    <EligibilitySnapshotPanel
      preflight={response}
      loading={false}
      error={null}
    />,
  );
}

/** The row whose label starts with `label`, e.g. "Voter's Assembly District:". */
function row(label: string): HTMLElement {
  const labelEl = screen.getByText(label);
  const rowEl = labelEl.closest("p");
  if (!rowEl) throw new Error(`No row for ${label}`);
  return rowEl;
}

describe("EligibilitySnapshotPanel", () => {
  it("shows both ADs for a candidate who fails the AD check", () => {
    renderPanel(
      preflight({
        eligible: false,
        hardStops: ["ASSEMBLY_DISTRICT_MISMATCH"],
        voter: { homeAssemblyDistrict: "136" },
        lted: { assemblyDistrict: "134" },
      }),
    );

    expect(row("Voter's Assembly District:")).toHaveTextContent("136");
    expect(row("Committee's Assembly District:")).toHaveTextContent("134");
    expect(
      screen.getByText(getIneligibilityMessage("ASSEMBLY_DISTRICT_MISMATCH")),
    ).toBeInTheDocument();
    expect(screen.queryByText(NO_CROSSWALK_MESSAGE)).not.toBeInTheDocument();
  });

  it("suggests no problem for a candidate from another ED in the same AD", () => {
    renderPanel(
      preflight({
        voter: { homeElectionDistrict: 9, homeAssemblyDistrict: "134" },
        lted: { electionDistrict: 5, assemblyDistrict: "134" },
      }),
    );

    expect(row("Home ED:")).toHaveTextContent("9");
    expect(row("Home ED:")).toHaveTextContent(/informational/i);
    expect(row("Voter's Assembly District:")).toHaveTextContent("134");
    expect(row("Committee's Assembly District:")).toHaveTextContent("134");
    expect(
      screen.queryByText("Ineligible for this committee"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Non-blocking warnings")).not.toBeInTheDocument();
    expect(screen.queryByText(NO_CROSSWALK_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says the committee's ED has no crosswalk entry when its AD is null", () => {
    renderPanel(
      preflight({
        eligible: false,
        hardStops: ["ASSEMBLY_DISTRICT_MISMATCH"],
        lted: { assemblyDistrict: null },
      }),
    );

    expect(row("Committee's Assembly District:")).toHaveTextContent(
      NO_CROSSWALK_MESSAGE,
    );
  });
});
