/**
 * The import reads its file through a roster parser: rows the parser could not read are
 * reported alongside the discrepancies, and one bad row does not cost the whole load.
 */
import * as xlsx from "xlsx";
import { applyRosterImport } from "~/app/api/admin/bulkLoadCommittees/bulkLoadUtils";
import { parseWithFormat } from "~/app/api/admin/bulkLoadCommittees/rosterFormats";
import { prismaMock } from "../../utils/mocks";
import {
  createMockCommitteeListRow,
  createMockCommitteeTerm,
  createMockGovernanceConfig,
  getMembershipMock,
} from "../../utils/testUtils";
import * as committeeValidation from "~/app/api/lib/committeeValidation";

jest.mock("~/app/api/lib/committeeValidation", () => {
  const actual = jest.requireActual<
    typeof import("~/app/api/lib/committeeValidation")
  >("~/app/api/lib/committeeValidation");
  return {
    ...actual,
    getActiveTerm: jest.fn(),
    getGovernanceConfig: jest.fn(),
  };
});

const getActiveTermMock = jest.mocked(committeeValidation.getActiveTerm);
const getGovernanceConfigMock = jest.mocked(
  committeeValidation.getGovernanceConfig,
);

const workbookRow = (overrides: Record<string, string>) => ({
  Committee: "Test City",
  "Serve LT": "1",
  "Serve ED": "1",
  name: "PAT Q SAMPLE",
  "res address1": "1 MAIN ST",
  "res city": "TESTVILLE",
  "res state": "NY",
  "res zip": "14604",
  "voter id": "VRC_OK",
  "election type": "Primary Election 2024",
  ...overrides,
});

/** A real workbook in the archived format, so the parse under test is the real one. */
const workbookBuffer = (rows: Record<string, string>[]): Buffer => {
  const book = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(
    book,
    xlsx.utils.json_to_sheet(rows),
    "Export Current Committee",
  );
  return xlsx.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
};

describe("the import reporting rows the parser rejected", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getActiveTermMock.mockResolvedValue(createMockCommitteeTerm());
    getGovernanceConfigMock.mockResolvedValue(
      createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
    );
    getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
    // Every voter is absent from the voter file, so each readable row becomes a
    // discrepancy and no membership write is attempted.
    prismaMock.voterRecord.findUnique.mockResolvedValue(null);
    prismaMock.committeeList.upsert.mockResolvedValue(createMockCommitteeListRow({
      id: 701,
      cityTown: "TEST CITY",
      electionDistrict: 1,
    }));
  });

  it("reports the rejected row and still imports the rest of the file", async () => {
    const parseResult = parseWithFormat(
      "committee-export-xlsx",
      workbookBuffer([
        workbookRow({ "voter id": "VRC_ONE" }),
        workbookRow({
          "voter id": "VRC_BAD",
          "election type": "Appointed by the Chair",
        }),
        workbookRow({ "voter id": "VRC_TWO" }),
      ]),
    );

    const {
      plan: { rejectedRows },
      applied: { discrepancies: discrepanciesMap },
    } = await applyRosterImport(parseResult);

    expect(rejectedRows).toEqual([
      {
        sourceRow: 3,
        reason: 'Unrecognized election type: "Appointed by the Chair"',
      },
    ]);
    expect(Array.from(discrepanciesMap.keys())).toEqual(["VRC_ONE", "VRC_TWO"]);
    expect(discrepanciesMap.has("VRC_BAD")).toBe(false);
  });

  it("reports no rejections for a file it reads in full", async () => {
    const parseResult = parseWithFormat(
      "committee-export-xlsx",
      workbookBuffer([workbookRow({ "voter id": "VRC_ONE" })]),
    );

    const {
      plan: { rejectedRows },
    } = await applyRosterImport(parseResult);

    expect(rejectedRows).toEqual([]);
  });

  it("describes the unmatched row on the discrepancy without any source column names", async () => {
    const parseResult = parseWithFormat(
      "committee-export-xlsx",
      workbookBuffer([workbookRow({ "voter id": "VRC_ONE" })]),
    );

    const {
      applied: { discrepancies: discrepanciesMap },
    } = await applyRosterImport(parseResult);

    expect(discrepanciesMap.get("VRC_ONE")?.discrepancies.VRCNUM).toEqual({
      incoming: "VRC_ONE",
      existing: "",
      fullRow: {
        name: "PAT Q SAMPLE",
        Add1: "1 MAIN ST",
        City: "TESTVILLE",
        State: "NY",
        Zip: "14604",
        CityTown: "TEST CITY",
        LT: "1",
        ED: "1",
        sourceRow: "2",
      },
    });
  });
});
