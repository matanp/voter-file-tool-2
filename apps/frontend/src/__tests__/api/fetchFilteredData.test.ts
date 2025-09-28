import { POST } from "~/app/api/fetchFilteredData/route";
import { PrivilegeLevel, type VoterRecord } from "@prisma/client";
import {
  createMockSession,
  createMockRequest,
  createAuthTestSuite,
  expectSuccessResponse,
  type AuthTestConfig,
} from "../utils/testUtils";
import {
  createEmptySearchQuery,
  createInvalidRequestData,
  createInvalidSearchQueryField,
  createValidRequestData,
  setupDatabaseMocks,
  expectFindManyCalledWithSubset,
  runPaginationTest,
  runSearchQueryTest,
  runValidationTest,
  runDatabaseErrorTest,
  runDateConversionTest,
  createSearchTestCase,
  createMissTestCase,
  SHARED_MOCK_VOTER_RECORDS,
  EXPECTED_RECORDS,
  type PaginationTestCase,
  type SearchQueryTestCase,
  type FetchFilteredDataValidationTestCase,
  type DatabaseErrorTestCase,
  type DateConversionTestCase,
} from "../utils/fetchFilteredDataTestUtils";
import type { DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { mockAuthSession, mockHasPermission, prismaMock } from "../utils/mocks";
import {
  searchableFieldEnum,
  convertPrismaVoterRecordToAPI,
} from "@voter-file-tool/shared-validators";

// Type alias for the Prisma mock
type PrismaMock = DeepMockProxy<PrismaClient>;

const setupAuthenticatedTest = (privilegeLevel = PrivilegeLevel.ReadAccess) => {
  const mockSession = createMockSession({ user: { privilegeLevel } });
  mockAuthSession(mockSession);
  mockHasPermission(true);
  return mockSession;
};

describe("/api/fetchFilteredData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/fetchFilteredData", () => {
    // Test configuration for authentication tests
    const authTestConfig: AuthTestConfig = {
      endpointName: "fetchFilteredData",
      requiredPrivilege: PrivilegeLevel.ReadAccess,
      mockRequest: () =>
        createMockRequest({
          searchQuery: [
            {
              field: searchableFieldEnum.enum.firstName,
              values: ["John"],
            },
          ],
          pageSize: 10,
          page: 1,
        }),
    };

    // Setup mocks for successful authentication tests
    const setupSuccessMocks = () => {
      // Use actual records from the shared dataset that match the search criteria
      const johnRecords = SHARED_MOCK_VOTER_RECORDS.filter(
        (record) => record.firstName === "John",
      );
      prismaMock.voterRecord.findMany.mockResolvedValue(johnRecords);
      prismaMock.voterRecord.count.mockResolvedValue(johnRecords.length);
    };

    // Parameterized authentication tests
    const authTests = createAuthTestSuite(
      authTestConfig,
      POST,
      mockAuthSession,
      mockHasPermission,
      setupSuccessMocks,
    );

    authTests.forEach(({ description, runTest }) => {
      it(description, runTest);
    });

    describe("Pagination tests", () => {
      const paginationTestCases: PaginationTestCase[] = [
        {
          description: "should handle basic pagination correctly",
          pageSize: 5,
          page: 3,
          expectedSkip: 10, // (3 - 1) * 5 = 10
          totalRecords: SHARED_MOCK_VOTER_RECORDS.length,
        },
        {
          description: "should handle large page numbers correctly",
          pageSize: 10,
          page: 4,
          expectedSkip: 30, // (4 - 1) * 10 = 30
          totalRecords: SHARED_MOCK_VOTER_RECORDS.length,
        },
        {
          description: "should handle maximum page size correctly",
          pageSize: 30,
          page: 1,
          expectedSkip: 0,
          totalRecords: SHARED_MOCK_VOTER_RECORDS.length,
        },
      ];

      paginationTestCases.forEach((testCase) => {
        it(testCase.description, async () => {
          await runPaginationTest(
            testCase,
            POST,
            setupAuthenticatedTest,
            prismaMock,
          );
        });
      });
    });

    describe("Search query tests", () => {
      const searchQueryTestCases: SearchQueryTestCase[] = [
        // Single field searches with hits
        createSearchTestCase(
          "should find John records by firstName",
          [{ field: searchableFieldEnum.enum.firstName, values: ["John"] }],
          { firstName: { in: ["JOHN"] } },
        ),
        createSearchTestCase(
          "should find Doe records by lastName",
          [{ field: searchableFieldEnum.enum.lastName, values: ["Doe"] }],
          { lastName: { in: ["DOE"] } },
        ),
        createSearchTestCase(
          "should find Boston residents by city",
          [{ field: searchableFieldEnum.enum.city, values: ["Boston"] }],
          { city: { in: ["Boston"] } },
        ),
        createSearchTestCase(
          "should find records by houseNum",
          [{ field: searchableFieldEnum.enum.houseNum, values: [123] }],
          { houseNum: { in: [123] } },
        ),
        createSearchTestCase(
          "should find Democratic party members",
          [{ field: searchableFieldEnum.enum.party, values: ["Democratic"] }],
          { party: { in: ["Democratic"] } },
        ),
        createSearchTestCase(
          "should find records by electionDistrict",
          [{ field: searchableFieldEnum.enum.electionDistrict, values: [1] }],
          { electionDistrict: { in: [1] } },
        ),
        createSearchTestCase(
          "should find records by DOB",
          [
            {
              field: searchableFieldEnum.enum.DOB,
              values: ["1985-03-15T00:00:00.000Z"],
            },
          ],
          { DOB: { in: ["1985-03-15T00:00:00.000Z"] } },
        ),
        createSearchTestCase(
          "should find records with email (hasEmail=true)",
          [{ field: searchableFieldEnum.enum.hasEmail, value: true }],
          {},
          true, // expectAndConditions
        ),
        createSearchTestCase(
          "should find records with phone (hasPhone=true)",
          [{ field: searchableFieldEnum.enum.hasPhone, value: true }],
          {},
          true, // expectAndConditions
        ),

        // Multiple field searches with hits
        createSearchTestCase(
          "should find John Doe in Boston",
          [
            { field: searchableFieldEnum.enum.firstName, values: ["John"] },
            { field: searchableFieldEnum.enum.lastName, values: ["Doe"] },
            { field: searchableFieldEnum.enum.city, values: ["Boston"] },
          ],
          {
            firstName: { in: ["JOHN"] },
            lastName: { in: ["DOE"] },
            city: { in: ["Boston"] },
          },
        ),
        createSearchTestCase(
          "should find Democratic residents of Boston",
          [
            { field: searchableFieldEnum.enum.party, values: ["Democratic"] },
            { field: searchableFieldEnum.enum.city, values: ["Boston"] },
          ],
          {
            party: { in: ["Democratic"] },
            city: { in: ["Boston"] },
          },
        ),

        // Multiple values with OR conditions
        createSearchTestCase(
          "should find John or Jane records",
          [
            {
              field: searchableFieldEnum.enum.firstName,
              values: ["John", "Jane"],
            },
          ],
          { firstName: { in: ["JOHN", "JANE"] } },
        ),
        createSearchTestCase(
          "should find Boston or New York residents",
          [
            {
              field: searchableFieldEnum.enum.city,
              values: ["Boston", "New York"],
            },
          ],
          { city: { in: ["Boston", "New York"] } },
        ),
        createSearchTestCase(
          "should find Democratic or Republican members",
          [
            {
              field: searchableFieldEnum.enum.party,
              values: ["Democratic", "Republican"],
            },
          ],
          { party: { in: ["Democratic", "Republican"] } },
        ),
        createSearchTestCase(
          "should find multiple house numbers",
          [{ field: searchableFieldEnum.enum.houseNum, values: [123, 456] }],
          { houseNum: { in: [123, 456] } },
        ),
        createSearchTestCase(
          "should find multiple election districts",
          [
            {
              field: searchableFieldEnum.enum.electionDistrict,
              values: [1, 2],
            },
          ],
          { electionDistrict: { in: [1, 2] } },
        ),

        // Miss cases - searches that should return no results
        createMissTestCase(
          "should return no results for non-existent firstName",
          [
            {
              field: searchableFieldEnum.enum.firstName,
              values: ["NonExistent"],
            },
          ],
          { firstName: { in: ["NONEXISTENT"] } },
        ),
        createMissTestCase(
          "should return no results for non-existent lastName",
          [
            {
              field: searchableFieldEnum.enum.lastName,
              values: ["NonExistent"],
            },
          ],
          { lastName: { in: ["NONEXISTENT"] } },
        ),
        createMissTestCase(
          "should return no results for non-existent city",
          [{ field: searchableFieldEnum.enum.city, values: ["NonExistent"] }],
          { city: { in: ["NonExistent"] } },
        ),
        createMissTestCase(
          "should return no results for non-existent houseNum",
          [{ field: searchableFieldEnum.enum.houseNum, values: [99999] }],
          { houseNum: { in: [99999] } },
        ),
        createMissTestCase(
          "should return no results for non-existent party",
          [{ field: searchableFieldEnum.enum.party, values: ["NonExistent"] }],
          { party: { in: ["NonExistent"] } },
        ),
        createMissTestCase(
          "should return no results for non-existent electionDistrict",
          [{ field: searchableFieldEnum.enum.electionDistrict, values: [999] }],
          { electionDistrict: { in: [999] } },
        ),
        createMissTestCase(
          "should return no results for non-existent DOB",
          [
            {
              field: searchableFieldEnum.enum.DOB,
              values: ["1900-01-01T00:00:00.000Z"],
            },
          ],
          { DOB: { in: ["1900-01-01T00:00:00.000Z"] } },
        ),

        // Complex miss cases - combinations that don't exist
        createMissTestCase(
          "should return no results for John Smith in Boston (doesn't exist)",
          [
            { field: searchableFieldEnum.enum.firstName, values: ["John"] },
            { field: searchableFieldEnum.enum.lastName, values: ["Smith"] },
            { field: searchableFieldEnum.enum.city, values: ["Boston"] },
          ],
          {
            firstName: { in: ["JOHN"] },
            lastName: { in: ["SMITH"] },
            city: { in: ["Boston"] },
          },
        ),
        createMissTestCase(
          "should return no results for Republican in Boston (doesn't exist)",
          [
            { field: searchableFieldEnum.enum.party, values: ["Republican"] },
            { field: searchableFieldEnum.enum.city, values: ["Boston"] },
          ],
          {
            party: { in: ["Republican"] },
            city: { in: ["Boston"] },
          },
        ),
      ];

      searchQueryTestCases.forEach((testCase) => {
        it(testCase.description, async () => {
          // Use hardcoded expected records based on the search query
          let expectedRecords: VoterRecord[] = [];
          let expectedTotal = 0;

          // Map search queries to hardcoded expected records
          if (testCase.searchQuery.length === 1) {
            const query = testCase.searchQuery[0]!;
            if (query.field === "firstName" && query.values?.includes("John")) {
              expectedRecords = EXPECTED_RECORDS.johnRecords;
            } else if (
              query.field === "lastName" &&
              query.values?.includes("Doe")
            ) {
              expectedRecords = EXPECTED_RECORDS.doeRecords;
            } else if (
              query.field === "city" &&
              query.values?.includes("Boston")
            ) {
              expectedRecords = EXPECTED_RECORDS.bostonRecords;
            } else if (
              query.field === "houseNum" &&
              query.values?.includes(123)
            ) {
              expectedRecords = EXPECTED_RECORDS.houseNum123Records;
            } else if (
              query.field === "party" &&
              query.values?.includes("Democratic")
            ) {
              expectedRecords = EXPECTED_RECORDS.democraticRecords;
            } else if (
              query.field === "electionDistrict" &&
              query.values?.includes(1)
            ) {
              expectedRecords = EXPECTED_RECORDS.electionDistrict1Records;
            } else if (
              query.field === "DOB" &&
              query.values?.some(
                (v) => typeof v === "string" && v.startsWith("1985-03-15"),
              )
            ) {
              expectedRecords = EXPECTED_RECORDS.dob1985Records;
            } else if (query.field === "hasEmail" && query.value === true) {
              expectedRecords = EXPECTED_RECORDS.recordsWithEmail;
            } else if (query.field === "hasPhone" && query.value === true) {
              expectedRecords = EXPECTED_RECORDS.recordsWithPhone;
            }
          } else if (testCase.searchQuery.length === 3) {
            // John Doe in Boston
            expectedRecords = EXPECTED_RECORDS.johnDoeBostonRecords;
          } else if (testCase.searchQuery.length === 2) {
            const fields = testCase.searchQuery.map((q) => q.field);
            if (fields.includes("party") && fields.includes("city")) {
              expectedRecords = EXPECTED_RECORDS.democraticBostonRecords;
            }
          }

          expectedTotal = expectedRecords.length;

          await runSearchQueryTest(
            testCase,
            POST,
            setupAuthenticatedTest,
            prismaMock,
            expectedRecords,
            expectedTotal,
          );
        });
      });
    });

    describe("Array values OR functionality tests", () => {
      const arrayOrTestCases: SearchQueryTestCase[] = [
        createSearchTestCase(
          "should handle multiple firstName values with OR condition",
          [
            {
              field: searchableFieldEnum.enum.firstName,
              values: ["John", "Jane", "Bob"],
            },
          ],
          { firstName: { in: ["JOHN", "JANE", "BOB"] } },
        ),
        createSearchTestCase(
          "should handle multiple lastName values with OR condition",
          [
            {
              field: searchableFieldEnum.enum.lastName,
              values: ["Smith", "Johnson", "Williams"],
            },
          ],
          { lastName: { in: ["SMITH", "JOHNSON", "WILLIAMS"] } },
        ),
        createSearchTestCase(
          "should handle multiple city values with OR condition",
          [
            {
              field: searchableFieldEnum.enum.city,
              values: ["New York", "Boston", "Chicago"],
            },
          ],
          { city: { in: ["New York", "Boston", "Chicago"] } },
        ),
        createSearchTestCase(
          "should handle multiple houseNum values with OR condition",
          [
            {
              field: searchableFieldEnum.enum.houseNum,
              values: [123, 456, 789],
            },
          ],
          { houseNum: { in: [123, 456, 789] } },
        ),
        createSearchTestCase(
          "should handle multiple electionDistrict values with OR condition",
          [
            {
              field: searchableFieldEnum.enum.electionDistrict,
              values: [1, 2, 3],
            },
          ],
          { electionDistrict: { in: [1, 2, 3] } },
        ),
        createSearchTestCase(
          "should handle multiple party values with OR condition",
          [
            {
              field: searchableFieldEnum.enum.party,
              values: ["Democratic", "Republican", "Independent"],
            },
          ],
          { party: { in: ["Democratic", "Republican", "Independent"] } },
        ),
        createSearchTestCase(
          "should handle multiple DOB values with OR condition",
          [
            {
              field: searchableFieldEnum.enum.DOB,
              values: [
                "1985-03-15T00:00:00.000Z",
                "1987-07-22T00:00:00.000Z",
                "1990-01-10T00:00:00.000Z",
              ],
            },
          ],
          {
            DOB: {
              in: [
                "1985-03-15T00:00:00.000Z",
                "1987-07-22T00:00:00.000Z",
                "1990-01-10T00:00:00.000Z",
              ],
            },
          },
        ),
        createSearchTestCase(
          "should handle hasEmail=true condition",
          [{ field: searchableFieldEnum.enum.hasEmail, value: true }],
          {},
          true, // expectAndConditions
        ),
        createSearchTestCase(
          "should handle hasPhone=true condition",
          [{ field: searchableFieldEnum.enum.hasPhone, value: true }],
          {},
          true, // expectAndConditions
        ),
      ];

      arrayOrTestCases.forEach((testCase) => {
        it(testCase.description, async () => {
          // Use hardcoded expected records based on the search query
          let expectedRecords: VoterRecord[] = [];
          let expectedTotal = 0;

          // Map search queries to hardcoded expected records
          if (testCase.searchQuery.length === 1) {
            const query = testCase.searchQuery[0]!;
            if (
              query.field === "firstName" &&
              query.values?.includes("John") &&
              query.values?.includes("Jane") &&
              query.values?.includes("Bob")
            ) {
              expectedRecords = EXPECTED_RECORDS.johnJaneBobRecords;
            } else if (
              query.field === "lastName" &&
              query.values?.includes("Smith") &&
              query.values?.includes("Johnson") &&
              query.values?.includes("Williams")
            ) {
              expectedRecords = EXPECTED_RECORDS.smithJohnsonWilliamsRecords;
            } else if (
              query.field === "city" &&
              query.values?.includes("New York") &&
              query.values?.includes("Boston") &&
              query.values?.includes("Chicago")
            ) {
              expectedRecords = EXPECTED_RECORDS.newYorkBostonChicagoRecords;
            } else if (
              query.field === "houseNum" &&
              query.values?.includes(123) &&
              query.values?.includes(456) &&
              query.values?.includes(789)
            ) {
              expectedRecords = EXPECTED_RECORDS.houseNum123456789Records;
            } else if (
              query.field === "electionDistrict" &&
              query.values?.includes(1) &&
              query.values?.includes(2) &&
              query.values?.includes(3)
            ) {
              expectedRecords = EXPECTED_RECORDS.electionDistrict123Records;
            } else if (
              query.field === "party" &&
              query.values?.includes("Democratic") &&
              query.values?.includes("Republican") &&
              query.values?.includes("Independent")
            ) {
              expectedRecords =
                EXPECTED_RECORDS.democraticRepublicanIndependentRecords;
            } else if (
              query.field === "DOB" &&
              query.values?.includes("1985-03-15T00:00:00.000Z") &&
              query.values?.includes("1987-07-22T00:00:00.000Z") &&
              query.values?.includes("1990-01-10T00:00:00.000Z")
            ) {
              expectedRecords = EXPECTED_RECORDS.dobMultipleRecords;
            } else if (query.field === "hasEmail" && query.value === true) {
              expectedRecords = EXPECTED_RECORDS.recordsWithEmail;
            } else if (query.field === "hasPhone" && query.value === true) {
              expectedRecords = EXPECTED_RECORDS.recordsWithPhone;
            }
          }

          expectedTotal = expectedRecords.length;

          await runSearchQueryTest(
            testCase,
            POST,
            setupAuthenticatedTest,
            prismaMock,
            expectedRecords,
            expectedTotal,
          );
        });
      });
    });

    describe("Mixed field types with array values tests", () => {
      const mixedFieldTestCases: SearchQueryTestCase[] = [
        createSearchTestCase(
          "should handle firstName OR condition combined with city AND condition",
          [
            {
              field: searchableFieldEnum.enum.firstName,
              values: ["John", "Jane"],
            },
            { field: searchableFieldEnum.enum.city, values: ["Boston"] },
          ],
          {
            firstName: { in: ["JOHN", "JANE"] },
            city: { in: ["Boston"] },
          },
        ),
        createSearchTestCase(
          "should handle multiple firstName values AND multiple city values",
          [
            {
              field: searchableFieldEnum.enum.firstName,
              values: ["John", "Jane"],
            },
            {
              field: searchableFieldEnum.enum.city,
              values: ["Boston", "New York"],
            },
          ],
          {
            firstName: { in: ["JOHN", "JANE"] },
            city: { in: ["Boston", "New York"] },
          },
        ),
        createSearchTestCase(
          "should handle multiple houseNum values AND multiple party values",
          [
            { field: searchableFieldEnum.enum.houseNum, values: [123, 456] },
            {
              field: searchableFieldEnum.enum.party,
              values: ["Democratic", "Republican"],
            },
          ],
          {
            houseNum: { in: [123, 456] },
            party: { in: ["Democratic", "Republican"] },
          },
        ),
        createSearchTestCase(
          "should handle multiple firstName values AND hasEmail condition",
          [
            {
              field: searchableFieldEnum.enum.firstName,
              values: ["John", "Jane"],
            },
            { field: searchableFieldEnum.enum.hasEmail, value: true },
          ],
          {
            firstName: { in: ["JOHN", "JANE"] },
          },
          true, // expectAndConditions
        ),
      ];

      mixedFieldTestCases.forEach((testCase) => {
        it(testCase.description, async () => {
          // Use hardcoded expected records based on the search query
          let expectedRecords: VoterRecord[] = [];
          let expectedTotal = 0;

          // Map search queries to hardcoded expected records
          if (testCase.searchQuery.length === 2) {
            const fields = testCase.searchQuery.map((q) => q.field);

            if (fields.includes("firstName") && fields.includes("city")) {
              const firstNameQuery = testCase.searchQuery.find(
                (q) => q.field === "firstName",
              );
              const cityQuery = testCase.searchQuery.find(
                (q) => q.field === "city",
              );

              if (
                firstNameQuery &&
                "values" in firstNameQuery &&
                cityQuery &&
                "values" in cityQuery
              ) {
                const firstNameValues = firstNameQuery.values as (
                  | string
                  | null
                )[];
                const cityValues = cityQuery.values as (string | null)[];
                if (
                  firstNameValues?.includes("John") &&
                  firstNameValues?.includes("Jane") &&
                  cityValues?.includes("Boston") &&
                  cityValues?.includes("New York")
                ) {
                  expectedRecords =
                    EXPECTED_RECORDS.johnJaneBostonNewYorkRecords;
                } else if (
                  firstNameValues?.includes("John") &&
                  firstNameValues?.includes("Jane") &&
                  cityValues?.includes("Boston")
                ) {
                  expectedRecords = EXPECTED_RECORDS.johnJaneBostonRecords;
                }
              }
            } else if (
              fields.includes("houseNum") &&
              fields.includes("party")
            ) {
              const houseNumQuery = testCase.searchQuery.find(
                (q) => q.field === "houseNum",
              );
              const partyQuery = testCase.searchQuery.find(
                (q) => q.field === "party",
              );

              if (
                houseNumQuery &&
                "values" in houseNumQuery &&
                partyQuery &&
                "values" in partyQuery
              ) {
                const houseNumValues = houseNumQuery.values as (
                  | number
                  | null
                )[];
                const partyValues = partyQuery.values as (string | null)[];
                if (
                  houseNumValues?.includes(123) &&
                  houseNumValues?.includes(456) &&
                  partyValues?.includes("Democratic") &&
                  partyValues?.includes("Republican")
                ) {
                  expectedRecords =
                    EXPECTED_RECORDS.houseNum123456DemocraticRepublicanRecords;
                }
              }
            } else if (
              fields.includes("firstName") &&
              fields.includes("hasEmail")
            ) {
              const firstNameQuery = testCase.searchQuery.find(
                (q) => q.field === "firstName",
              );
              const hasEmailQuery = testCase.searchQuery.find(
                (q) => q.field === "hasEmail",
              );

              if (
                firstNameQuery &&
                "values" in firstNameQuery &&
                hasEmailQuery &&
                "value" in hasEmailQuery
              ) {
                const firstNameValues = firstNameQuery.values as (
                  | string
                  | null
                )[];
                if (
                  firstNameValues?.includes("John") &&
                  firstNameValues?.includes("Jane") &&
                  hasEmailQuery.value === true
                ) {
                  expectedRecords = EXPECTED_RECORDS.johnJaneWithEmailRecords;
                }
              }
            }
          }

          expectedTotal = expectedRecords.length;

          await runSearchQueryTest(
            testCase,
            POST,
            setupAuthenticatedTest,
            prismaMock,
            expectedRecords,
            expectedTotal,
          );
        });
      });
    });

    describe("Array values edge cases tests", () => {
      const edgeCaseTestCases: SearchQueryTestCase[] = [
        createSearchTestCase(
          "should handle empty values in array (filtered out)",
          [
            {
              field: searchableFieldEnum.enum.firstName,
              values: ["John", "", "Jane", null],
            },
          ],
          { firstName: { in: ["JOHN", "JANE"] } },
        ),
        createMissTestCase(
          "should handle all empty values in array (no query generated)",
          [
            {
              field: searchableFieldEnum.enum.firstName,
              values: ["", null, ""],
            },
          ],
          {},
        ),
        createSearchTestCase(
          "should handle mixed valid and invalid values in number field",
          [
            {
              field: searchableFieldEnum.enum.houseNum,
              values: [123, null, 456, 0],
            },
          ],
          { houseNum: { in: [123, 456, 0] } },
        ),
        createSearchTestCase(
          "should handle case-insensitive name field values",
          [
            {
              field: searchableFieldEnum.enum.firstName,
              values: ["john", "JANE", "Bob"],
            },
          ],
          { firstName: { in: ["JOHN", "JANE", "BOB"] } },
        ),
        createSearchTestCase(
          "should handle whitespace trimming in name fields",
          [
            {
              field: searchableFieldEnum.enum.firstName,
              values: [" John ", " Jane ", " Bob "],
            },
          ],
          { firstName: { in: ["JOHN", "JANE", "BOB"] } },
        ),
      ];

      edgeCaseTestCases.forEach((testCase) => {
        it(testCase.description, async () => {
          // Use hardcoded expected records based on the search query
          let expectedRecords: VoterRecord[] = [];
          let expectedTotal = 0;

          // Map search queries to hardcoded expected records
          if (testCase.searchQuery.length === 1) {
            const query = testCase.searchQuery[0]!;
            if (
              query.field === "firstName" &&
              query.values?.includes("John") &&
              query.values?.includes("Jane")
            ) {
              // Empty values filtered out case
              expectedRecords = EXPECTED_RECORDS.johnJaneFilteredRecords;
            } else if (
              query.field === "firstName" &&
              query.values?.includes("john") &&
              query.values?.includes("JANE") &&
              query.values?.includes("Bob")
            ) {
              // Case insensitive case
              expectedRecords =
                EXPECTED_RECORDS.johnJaneBobCaseInsensitiveRecords;
            } else if (
              query.field === "firstName" &&
              query.values?.includes(" John ") &&
              query.values?.includes(" Jane ") &&
              query.values?.includes(" Bob ")
            ) {
              // Whitespace trimming case
              expectedRecords = EXPECTED_RECORDS.johnJaneBobTrimmedRecords;
            } else if (
              query.field === "houseNum" &&
              query.values?.includes(123) &&
              query.values?.includes(456) &&
              query.values?.includes(0)
            ) {
              // Mixed valid and invalid values case
              expectedRecords = EXPECTED_RECORDS.houseNum123456Records.concat(
                SHARED_MOCK_VOTER_RECORDS.filter(
                  (record) => record.houseNum === 0,
                ),
              );
            }
          }

          expectedTotal = expectedRecords.length;

          await runSearchQueryTest(
            testCase,
            POST,
            setupAuthenticatedTest,
            prismaMock,
            expectedRecords,
            expectedTotal,
          );
        });
      });
    });

    describe("Multiple records filtering tests", () => {
      it("should return only matching records when searching in a larger dataset", async () => {
        // Arrange: Use actual records from shared dataset that match the search criteria
        const johnRecords = SHARED_MOCK_VOTER_RECORDS.filter(
          (record) => record.firstName === "John",
        );

        setupAuthenticatedTest();
        setupDatabaseMocks(johnRecords, johnRecords.length, prismaMock);

        const requestData = createValidRequestData(
          [{ field: searchableFieldEnum.enum.firstName, values: ["John"] }],
          10,
          1,
        );
        const request = createMockRequest(requestData);

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(response, {
          data: johnRecords.map(convertPrismaVoterRecordToAPI),
          totalRecords: johnRecords.length,
        });

        // Verify the correct where clause was used
        expectFindManyCalledWithSubset(
          {
            where: { firstName: { in: ["JOHN"] } },
            skip: 0,
            take: 10,
          },
          0,
          prismaMock,
        );
      });

      it("should handle pagination correctly with multiple matching records", async () => {
        // Arrange: Get John records and simulate pagination
        const johnRecords = SHARED_MOCK_VOTER_RECORDS.filter(
          (record) => record.firstName === "John",
        );

        // For page 2 with pageSize 2, we should get records 3 and 4 (skip 2, take 2)
        const page2Records = johnRecords.slice(2, 4);

        setupAuthenticatedTest();
        setupDatabaseMocks(page2Records, johnRecords.length, prismaMock);

        const requestData = createValidRequestData(
          [{ field: searchableFieldEnum.enum.firstName, values: ["John"] }],
          2, // pageSize
          2, // page
        );
        const request = createMockRequest(requestData);

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(response, {
          data: page2Records.map(convertPrismaVoterRecordToAPI),
          totalRecords: johnRecords.length,
        });

        // Verify pagination calculation: skip = (2-1) * 2 = 2
        expectFindManyCalledWithSubset(
          {
            where: { firstName: { in: ["JOHN"] } },
            skip: 2,
            take: 2,
          },
          0,
          prismaMock,
        );
      });

      it("should filter by multiple criteria and return only records matching all conditions", async () => {
        // Arrange: Filter for John Doe in Boston
        const matchingRecords = SHARED_MOCK_VOTER_RECORDS.filter(
          (record) =>
            record.firstName === "John" &&
            record.lastName === "Doe" &&
            record.city === "Boston",
        );

        setupAuthenticatedTest();
        setupDatabaseMocks(matchingRecords, matchingRecords.length, prismaMock);

        const requestData = createValidRequestData(
          [
            { field: searchableFieldEnum.enum.firstName, values: ["John"] },
            { field: searchableFieldEnum.enum.lastName, values: ["Doe"] },
            { field: searchableFieldEnum.enum.city, values: ["Boston"] },
          ],
          10,
          1,
        );
        const request = createMockRequest(requestData);

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(response, {
          data: matchingRecords.map(convertPrismaVoterRecordToAPI),
          totalRecords: matchingRecords.length,
        });

        // Verify the correct where clause was used
        expectFindManyCalledWithSubset(
          {
            where: {
              firstName: { in: ["JOHN"] },
              lastName: { in: ["DOE"] },
              city: { in: ["Boston"] },
            },
            skip: 0,
            take: 10,
          },
          0,
          prismaMock,
        );
      });

      it("should handle hasEmail filtering with multiple records", async () => {
        // Arrange: Filter for records with email
        const recordsWithEmail = SHARED_MOCK_VOTER_RECORDS.filter(
          (record) => record.email !== null && record.email !== "",
        );

        setupAuthenticatedTest();
        setupDatabaseMocks(
          recordsWithEmail,
          recordsWithEmail.length,
          prismaMock,
        );

        const requestData = createValidRequestData(
          [{ field: searchableFieldEnum.enum.hasEmail, value: true }],
          10,
          1,
        );
        const request = createMockRequest(requestData);

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(response, {
          data: recordsWithEmail.map(convertPrismaVoterRecordToAPI),
          totalRecords: recordsWithEmail.length,
        });

        // Verify the correct where clause was used (should include AND conditions for email)
        const query = prismaMock.voterRecord.findMany.mock.calls[0];
        const queryArgs = query?.[0] as { where?: { AND?: unknown } };
        expect(queryArgs?.where).toHaveProperty("AND");
        expect(Array.isArray(queryArgs?.where?.AND)).toBe(true);
      });
    });

    describe("Validation tests", () => {
      // Setup authenticated session for validation tests
      const setupAuthMocks = () => {
        setupAuthenticatedTest();
      };

      const validationTestCases: FetchFilteredDataValidationTestCase[] = [
        {
          description: "should return 422 for missing searchQuery",
          requestData: createInvalidRequestData(
            undefined, // Missing searchQuery
            10,
            1,
          ),
        },
        {
          description: "should return 422 for invalid pageSize (too small)",
          requestData: createInvalidRequestData(
            createEmptySearchQuery(),
            0, // Invalid: must be >= 1
            1,
          ),
        },
        {
          description: "should return 422 for invalid pageSize (too large)",
          requestData: createInvalidRequestData(
            createEmptySearchQuery(),
            101, // Invalid: must be <= 100
            1,
          ),
        },
        {
          description: "should return 422 for invalid page (too small)",
          requestData: createInvalidRequestData(
            createEmptySearchQuery(),
            10,
            0, // Invalid: must be >= 1
          ),
        },
        {
          description: "should return 422 for invalid searchQuery field",
          requestData: createInvalidRequestData(
            [createInvalidSearchQueryField("invalidField", ["test"])],
            10,
            1,
          ),
        },
        {
          description: "should return 422 for invalid searchQuery value type",
          requestData: createInvalidRequestData(
            [
              createInvalidSearchQueryField(
                searchableFieldEnum.enum.firstName,
                [123],
              ),
            ], // Invalid: should be string for firstName
            10,
            1,
          ),
        },
        {
          description: "should return 422 for non-integer page",
          requestData: createInvalidRequestData(
            createEmptySearchQuery(),
            10,
            1.5,
          ),
        },
        {
          description: "should return 422 for non-integer pageSize",
          requestData: createInvalidRequestData(
            createEmptySearchQuery(),
            1.5,
            1,
          ),
        },
        {
          description: "should return 422 for string page",
          requestData: createInvalidRequestData(
            createEmptySearchQuery(),
            10,
            "1" as unknown as number, // Intentionally wrong type
          ),
        },
        {
          description: "should return 422 for missing page",
          requestData: { searchQuery: createEmptySearchQuery(), pageSize: 10 },
        },
        {
          description: "should return 422 for missing pageSize",
          requestData: { searchQuery: createEmptySearchQuery(), page: 1 },
        },
        {
          description: "should return 422 for negative page",
          requestData: createInvalidRequestData(
            createEmptySearchQuery(),
            10,
            -1,
          ),
        },
      ];

      validationTestCases.forEach((testCase) => {
        it(testCase.description, async () => {
          await runValidationTest(testCase, POST, setupAuthMocks, prismaMock);
        });
      });
    });

    describe("Database error handling", () => {
      const databaseErrorTestCases: DatabaseErrorTestCase[] = [
        {
          description: "should return 500 for database error during findMany",
          mockSetup: (prismaMock: PrismaMock) => {
            prismaMock.voterRecord.findMany.mockRejectedValue(
              new Error("Database connection failed"),
            );
          },
          expectedCalls: { findMany: true, count: false },
        },
        {
          description: "should return 500 for database error during count",
          mockSetup: (prismaMock: PrismaMock) => {
            prismaMock.voterRecord.findMany.mockResolvedValue([
              SHARED_MOCK_VOTER_RECORDS[0]!,
            ]);
            prismaMock.voterRecord.count.mockRejectedValue(
              new Error("Database count failed"),
            );
          },
          expectedCalls: { findMany: true, count: true },
        },
      ];

      databaseErrorTestCases.forEach((testCase) => {
        it(testCase.description, async () => {
          await runDatabaseErrorTest(
            testCase,
            POST,
            setupAuthenticatedTest,
            prismaMock,
          );
        });
      });
    });

    // Edge case tests for data conversion
    describe("Data conversion edge cases", () => {
      const testDate = new Date("2023-01-01T00:00:00.000Z");

      const dateConversionTestCases: DateConversionTestCase[] = [
        {
          description: "should handle voter records with null dates correctly",
          mockData: { DOB: null, lastUpdate: null, originalRegDate: null },
          expectedData: { DOB: null, lastUpdate: null, originalRegDate: null },
        },
        {
          description: "should handle voter records with valid dates correctly",
          mockData: {
            DOB: testDate,
            lastUpdate: testDate,
            originalRegDate: testDate,
          },
          expectedData: {
            DOB: testDate.toISOString(),
            lastUpdate: testDate.toISOString(),
            originalRegDate: testDate.toISOString(),
          },
        },
        {
          description: "should handle mixed null and valid dates correctly",
          mockData: {
            DOB: testDate,
            lastUpdate: null,
            originalRegDate: testDate,
          },
          expectedData: {
            DOB: testDate.toISOString(),
            lastUpdate: null,
            originalRegDate: testDate.toISOString(),
          },
        },
      ];

      dateConversionTestCases.forEach((testCase) => {
        it(testCase.description, async () => {
          await runDateConversionTest(
            testCase,
            POST,
            setupAuthenticatedTest,
            prismaMock,
          );
        });
      });
    });
  });
});
