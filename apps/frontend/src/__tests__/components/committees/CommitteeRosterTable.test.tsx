import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommitteeRosterTable } from "~/app/committees/CommitteeRosterTable";
import type {
  RosterResponse,
  SeatRosterRow,
} from "~/lib/validations/committee";

function occupant(
  overrides: Partial<NonNullable<SeatRosterRow["occupant"]>> = {},
): NonNullable<SeatRosterRow["occupant"]> {
  return {
    VRCNUM: "V1",
    firstName: "Jane",
    lastName: "Doe",
    membershipType: "PETITIONED",
    ...overrides,
  };
}

function baseResponse(): RosterResponse {
  const rows: SeatRosterRow[] = [
    {
      committeeListId: 1,
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 5,
      seatNumber: 1,
      isPetitioned: true,
      weight: "1.00",
      occupant: occupant({ VRCNUM: "V1", firstName: "Jane", lastName: "Doe" }),
      contact: { email: "jane@example.com", phone: "555-1111" },
    },
    {
      committeeListId: 1,
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 5,
      seatNumber: 2,
      isPetitioned: false,
      weight: null,
      occupant: null,
    },
    {
      committeeListId: 1,
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 5,
      seatNumber: 3,
      isPetitioned: true,
      weight: null,
      occupant: null,
      petitionedVacant: true,
    },
    {
      committeeListId: 1,
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 5,
      seatNumber: null,
      isPetitioned: false,
      weight: null,
      unassigned: true,
      occupant: occupant({
        VRCNUM: "V9",
        firstName: "Sam",
        lastName: "Loose",
        membershipType: "APPOINTED",
      }),
      contact: { email: null, phone: null },
    },
  ];

  return {
    scope: { cityTown: "GREECE", legDistrict: 1 },
    rows,
    edRollups: [
      {
        electionDistrict: 5,
        legDistrict: 1,
        filled: 1,
        totalSeats: 3,
        unassignedCount: 1,
        designationWeight: 1,
        missingWeightSeatNumbers: [],
      },
    ],
    summary: {
      totalSeats: 3,
      filled: 1,
      vacant: 2,
      edCount: 1,
      unassignedCount: 1,
    },
  };
}

describe("CommitteeRosterTable", () => {
  it("renders the town-wide summary header", () => {
    render(<CommitteeRosterTable data={baseResponse()} isAdmin={false} />);
    expect(screen.getByTestId("roster-summary")).toHaveTextContent(
      "1/3 seats filled · 2 vacant · 1 ED",
    );
  });

  it("renders a per-ED rollup subheader with filled count and weight", () => {
    render(<CommitteeRosterTable data={baseResponse()} isAdmin={false} />);
    expect(
      screen.getByText(/ED 5 · 1\/3 filled · weight 1\.00 · 1 unassigned/),
    ).toBeInTheDocument();
  });

  it("shows occupant name and vacant/petitioned-vacant labels", () => {
    render(<CommitteeRosterTable data={baseResponse()} isAdmin={false} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("— vacant —")).toBeInTheDocument();
    expect(screen.getByText("— petitioned vacant —")).toBeInTheDocument();
  });

  it("groups unassigned members under an Unassigned sub-section", () => {
    render(<CommitteeRosterTable data={baseResponse()} isAdmin={false} />);
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("Sam Loose")).toBeInTheDocument();
  });

  it("hides Contact column for Leaders but shows View details when handler provided", () => {
    const data = baseResponse();
    // Leaders never receive contact from the API.
    for (const row of data.rows) delete row.contact;
    render(
      <CommitteeRosterTable
        data={data}
        isAdmin={false}
        onViewEdDetails={jest.fn()}
      />,
    );
    expect(screen.queryByText("Contact")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View details" })).toBeInTheDocument();
  });

  it("shows Contact column with email/phone for Admins", () => {
    render(<CommitteeRosterTable data={baseResponse()} isAdmin />);
    expect(screen.getByText("Contact")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("555-1111")).toBeInTheDocument();
  });

  it("renders View details on ED header and invokes onViewEdDetails with the rollup", async () => {
    const onViewEdDetails = jest.fn();
    render(
      <CommitteeRosterTable
        data={baseResponse()}
        isAdmin={false}
        onViewEdDetails={onViewEdDetails}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "View details" }));
    expect(onViewEdDetails).toHaveBeenCalledTimes(1);
    expect(onViewEdDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        electionDistrict: 5,
        legDistrict: 1,
        filled: 1,
        totalSeats: 3,
      }),
    );
  });

  it("renders weight em-dash when a seat is missing weight (incomplete ≠ zero)", () => {
    const data = baseResponse();
    data.edRollups[0]!.missingWeightSeatNumbers = [3];
    data.edRollups[0]!.designationWeight = 1;
    render(<CommitteeRosterTable data={data} isAdmin={false} />);
    expect(screen.getByText(/ED 5 .* weight —/)).toBeInTheDocument();
  });

  it("sorts seated rows by seat number within a group", () => {
    const data = baseResponse();
    // Reverse the row order to prove the component sorts, not the input.
    data.rows = [...data.rows].reverse();
    render(<CommitteeRosterTable data={data} isAdmin={false} />);
    const rows = screen.getAllByRole("row");
    // Header + ED subheader + seats 1,2,3 + Unassigned subheader + unassigned row.
    const seatCells = rows
      .slice(2, 5)
      .map((r) => within(r).getAllByRole("cell")[1]?.textContent);
    expect(seatCells).toEqual(["1", "2", "3"]);
  });

  it("pluralizes ED count in the summary", () => {
    const data = baseResponse();
    data.summary.edCount = 3;
    render(<CommitteeRosterTable data={data} isAdmin={false} />);
    expect(screen.getByTestId("roster-summary")).toHaveTextContent("3 EDs");
  });
});
