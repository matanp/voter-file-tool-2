import { POST } from "~/app/api/fetchFilteredData/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockVoterRecord,
  createMockRequest,
  createAuthTestSuite,
  type AuthTestConfig,
} from "../utils/testUtils";
import {
  createEmptySearchQuery,
  createInvalidRequestData,
  createInvalidSearchQueryField,
  runPaginationTest,
  runSearchQueryTest,
  runValidationTest,
  runDatabaseErrorTest,
  runDateConversionTest,
  type PaginationTestCase,
  type SearchQueryTestCase,
  type FetchFilteredDataValidationTestCase,
  type DatabaseErrorTestCase,
  type DateConversionTestCase,
} from "../utils/fetchFilteredDataTestUtils";
import type { DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { mockAuthSession, mockHasPermission, prismaMock } from "../utils/mocks";
import { searchableFieldEnum } from "@voter-file-tool/shared-validators";

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
              value: "John",
            },
          ],
          pageSize: 10,
          page: 1,
        }),
    };

    // Setup mocks for successful authentication tests
    const setupSuccessMocks = () => {
      const mockVoterRecords = [createMockVoterRecord({ firstName: "John" })];
      prismaMock.voterRecord.findMany.mockResolvedValue(mockVoterRecords);
      prismaMock.voterRecord.count.mockResolvedValue(1);
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
          totalRecords: 25,
        },
        {
          description: "should handle large page numbers correctly",
          pageSize: 10,
          page: 50,
          expectedSkip: 490, // (50 - 1) * 10 = 490
          totalRecords: 1000,
        },
        {
          description: "should handle maximum page size correctly",
          pageSize: 100,
          page: 1,
          expectedSkip: 0,
          totalRecords: 100,
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
        {
          description: "should handle single field search",
          searchQuery: [
            { field: searchableFieldEnum.enum.firstName, value: "John" },
          ],
          expectedWhere: { firstName: "JOHN" },
          mockRecords: [createMockVoterRecord({ firstName: "John" })],
          expectedTotal: 1,
        },
        {
          description: "should handle multiple field search",
          searchQuery: [
            { field: searchableFieldEnum.enum.firstName, value: "John" },
            { field: searchableFieldEnum.enum.lastName, value: "Doe" },
            { field: searchableFieldEnum.enum.city, value: "Test City" },
          ],
          expectedWhere: {
            firstName: "JOHN",
            lastName: "DOE",
            city: "Test City",
          },
          mockRecords: [
            createMockVoterRecord({
              firstName: "John",
              lastName: "Doe",
              city: "Test City",
            }),
          ],
          expectedTotal: 1,
        },
        {
          description: "should handle empty search results",
          searchQuery: [
            { field: searchableFieldEnum.enum.firstName, value: "NonExistent" },
          ],
          expectedWhere: { firstName: "NONEXISTENT" },
          mockRecords: [],
          expectedTotal: 0,
        },
        {
          description: "should handle different field types correctly",
          searchQuery: [
            { field: searchableFieldEnum.enum.houseNum, value: 123 },
            { field: searchableFieldEnum.enum.hasEmail, value: true },
            { field: searchableFieldEnum.enum.firstName, value: "John" },
          ],
          expectedWhere: { firstName: "JOHN", houseNum: 123 },
          mockRecords: [createMockVoterRecord()],
          expectedTotal: 1,
          expectAndConditions: true,
        },
      ];

      searchQueryTestCases.forEach((testCase) => {
        it(testCase.description, async () => {
          await runSearchQueryTest(
            testCase,
            POST,
            setupAuthenticatedTest,
            prismaMock,
          );
        });
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
            [createInvalidSearchQueryField("invalidField", "test")],
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
                123,
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
              createMockVoterRecord(),
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
