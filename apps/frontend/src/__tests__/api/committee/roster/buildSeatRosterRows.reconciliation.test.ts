/**
 * Roster regression: persisted seats should reflect maxSeatsPerLted after reconciliation.
 */

import { buildSeatRosterRows } from "~/app/api/committee/roster/buildSeatRosterRows";
import { DEFAULT_ACTIVE_TERM_ID } from "../../../utils/testUtils";

describe("buildSeatRosterRows seat count after maxSeatsPerLted reconciliation", () => {
  const committeeBase = {
    id: 1,
    cityTown: "GREECE",
    legDistrict: 1,
    electionDistrict: 1,
    memberships: [],
  };

  it("renders 6 seats after 4 -> 6 when persisted seats exist", () => {
    const result = buildSeatRosterRows(
      [
        {
          ...committeeBase,
          seats: [1, 2, 3, 4, 5, 6].map((seatNumber) => ({
            seatNumber,
            isPetitioned: false,
            weight: "32",
          })),
        },
      ],
      {
        termId: DEFAULT_ACTIVE_TERM_ID,
        maxSeatsPerLted: 6,
        includeContact: false,
      },
    );

    expect(result.summary.totalSeats).toBe(6);
    expect(result.rows.filter((row) => row.seatNumber != null)).toHaveLength(6);
  });

  it("renders 2 seats after allowed 4 -> 2 when persisted seats exist", () => {
    const result = buildSeatRosterRows(
      [
        {
          ...committeeBase,
          seats: [1, 2].map((seatNumber) => ({
            seatNumber,
            isPetitioned: false,
            weight: "64",
          })),
        },
      ],
      {
        termId: DEFAULT_ACTIVE_TERM_ID,
        maxSeatsPerLted: 2,
        includeContact: false,
      },
    );

    expect(result.summary.totalSeats).toBe(2);
    expect(result.rows.filter((row) => row.seatNumber != null)).toHaveLength(2);
  });
});
