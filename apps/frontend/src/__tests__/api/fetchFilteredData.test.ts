import { POST } from "~/app/api/fetchFilteredData/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockVoterRecord,
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
        {
          description: "should handle date of birth search correctly",
          searchQuery: [
            { field: searchableFieldEnum.enum.DOB, value: "1990-01-01" },
          ],
          expectedWhere: { DOB: "1990-01-01" },
          mockRecords: [createMockVoterRecord({ DOB: new Date("1990-01-01") })],
          expectedTotal: 1,
        },
        {
          description:
            "should filter multiple records by firstName and return subset",
          searchQuery: [
            { field: searchableFieldEnum.enum.firstName, value: "John" },
          ],
          expectedWhere: { firstName: "JOHN" },
          mockRecords: [
            createMockVoterRecord({
              firstName: "John",
              lastName: "Doe",
              VRCNUM: "VR001",
            }),
            createMockVoterRecord({
              firstName: "John",
              lastName: "Smith",
              VRCNUM: "VR002",
            }),
          ],
          expectedTotal: 2,
        },
        {
          description:
            "should filter multiple records by lastName and return subset",
          searchQuery: [
            { field: searchableFieldEnum.enum.lastName, value: "Smith" },
          ],
          expectedWhere: { lastName: "SMITH" },
          mockRecords: [
            createMockVoterRecord({
              firstName: "John",
              lastName: "Smith",
              VRCNUM: "VR001",
            }),
            createMockVoterRecord({
              firstName: "Jane",
              lastName: "Smith",
              VRCNUM: "VR002",
            }),
            createMockVoterRecord({
              firstName: "Bob",
              lastName: "Smith",
              VRCNUM: "VR003",
            }),
          ],
          expectedTotal: 3,
        },
        {
          description:
            "should filter multiple records by city and return subset",
          searchQuery: [
            { field: searchableFieldEnum.enum.city, value: "New York" },
          ],
          expectedWhere: { city: "New York" },
          mockRecords: [
            createMockVoterRecord({
              firstName: "Alice",
              city: "New York",
              VRCNUM: "VR001",
            }),
            createMockVoterRecord({
              firstName: "Bob",
              city: "New York",
              VRCNUM: "VR002",
            }),
          ],
          expectedTotal: 2,
        },
        {
          description:
            "should filter multiple records by multiple fields and return subset",
          searchQuery: [
            { field: searchableFieldEnum.enum.firstName, value: "John" },
            { field: searchableFieldEnum.enum.city, value: "Boston" },
          ],
          expectedWhere: {
            firstName: "JOHN",
            city: "Boston",
          },
          mockRecords: [
            createMockVoterRecord({
              firstName: "John",
              city: "Boston",
              VRCNUM: "VR001",
            }),
            createMockVoterRecord({
              firstName: "John",
              city: "Boston",
              VRCNUM: "VR002",
            }),
          ],
          expectedTotal: 2,
        },
        {
          description:
            "should filter by houseNum and return subset from multiple records",
          searchQuery: [
            { field: searchableFieldEnum.enum.houseNum, value: 123 },
          ],
          expectedWhere: { houseNum: 123 },
          mockRecords: [
            createMockVoterRecord({
              houseNum: 123,
              firstName: "Alice",
              VRCNUM: "VR001",
            }),
            createMockVoterRecord({
              houseNum: 123,
              firstName: "Bob",
              VRCNUM: "VR002",
            }),
            createMockVoterRecord({
              houseNum: 123,
              firstName: "Charlie",
              VRCNUM: "VR003",
            }),
          ],
          expectedTotal: 3,
        },
        {
          description:
            "should filter by hasEmail=true and return subset from multiple records",
          searchQuery: [
            { field: searchableFieldEnum.enum.hasEmail, value: true },
          ],
          expectedWhere: {}, // hasEmail gets converted to AND conditions
          mockRecords: [
            createMockVoterRecord({
              email: "alice@example.com",
              firstName: "Alice",
              VRCNUM: "VR001",
            }),
            createMockVoterRecord({
              email: "bob@example.com",
              firstName: "Bob",
              VRCNUM: "VR002",
            }),
          ],
          expectedTotal: 2,
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

    describe("Multiple records filtering tests", () => {
      it("should return only matching records when searching in a larger dataset", async () => {
        // Arrange: Create a larger dataset with mixed data
        const allRecords = [
          createMockVoterRecord({
            firstName: "John",
            lastName: "Doe",
            city: "New York",
            VRCNUM: "VR001",
          }),
          createMockVoterRecord({
            firstName: "Jane",
            lastName: "Smith",
            city: "Boston",
            VRCNUM: "VR002",
          }),
          createMockVoterRecord({
            firstName: "John",
            lastName: "Johnson",
            city: "Chicago",
            VRCNUM: "VR003",
          }),
          createMockVoterRecord({
            firstName: "Alice",
            lastName: "Brown",
            city: "New York",
            VRCNUM: "VR004",
          }),
          createMockVoterRecord({
            firstName: "Bob",
            lastName: "Wilson",
            city: "Boston",
            VRCNUM: "VR005",
          }),
          createMockVoterRecord({
            firstName: "John",
            lastName: "Davis",
            city: "Miami",
            VRCNUM: "VR006",
          }),
        ];

        // Only return records that match firstName: "John"
        const matchingRecords = allRecords.filter(
          (record) => record.firstName === "John",
        );

        setupAuthenticatedTest();
        setupDatabaseMocks(matchingRecords, matchingRecords.length, prismaMock);

        const requestData = createValidRequestData(
          [{ field: searchableFieldEnum.enum.firstName, value: "John" }],
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
            where: { firstName: "JOHN" },
            skip: 0,
            take: 10,
          },
          0,
          prismaMock,
        );
      });

      it("should handle pagination correctly with multiple matching records", async () => {
        // Arrange: Create 5 records that match the search
        const matchingRecords = [
          createMockVoterRecord({
            firstName: "John",
            lastName: "Doe",
            VRCNUM: "VR001",
          }),
          createMockVoterRecord({
            firstName: "John",
            lastName: "Smith",
            VRCNUM: "VR002",
          }),
          createMockVoterRecord({
            firstName: "John",
            lastName: "Johnson",
            VRCNUM: "VR003",
          }),
          createMockVoterRecord({
            firstName: "John",
            lastName: "Brown",
            VRCNUM: "VR004",
          }),
          createMockVoterRecord({
            firstName: "John",
            lastName: "Wilson",
            VRCNUM: "VR005",
          }),
        ];

        // For page 2 with pageSize 2, we should get records 3 and 4 (skip 2, take 2)
        const page2Records = matchingRecords.slice(2, 4);

        setupAuthenticatedTest();
        setupDatabaseMocks(page2Records, matchingRecords.length, prismaMock);

        const requestData = createValidRequestData(
          [{ field: searchableFieldEnum.enum.firstName, value: "John" }],
          2, // pageSize
          2, // page
        );
        const request = createMockRequest(requestData);

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(response, {
          data: page2Records.map(convertPrismaVoterRecordToAPI),
          totalRecords: matchingRecords.length,
        });

        // Verify pagination calculation: skip = (2-1) * 2 = 2
        expectFindManyCalledWithSubset(
          {
            where: { firstName: "JOHN" },
            skip: 2,
            take: 2,
          },
          0,
          prismaMock,
        );
      });

      it("should filter by multiple criteria and return only records matching all conditions", async () => {
        // Arrange: Create records with various combinations
        const allRecords = [
          createMockVoterRecord({
            firstName: "John",
            city: "Boston",
            houseNum: 123,
            VRCNUM: "VR001",
          }),
          createMockVoterRecord({
            firstName: "John",
            city: "New York",
            houseNum: 123,
            VRCNUM: "VR002",
          }),
          createMockVoterRecord({
            firstName: "Jane",
            city: "Boston",
            houseNum: 123,
            VRCNUM: "VR003",
          }),
          createMockVoterRecord({
            firstName: "John",
            city: "Boston",
            houseNum: 456,
            VRCNUM: "VR004",
          }),
          createMockVoterRecord({
            firstName: "John",
            city: "Boston",
            houseNum: 123,
            VRCNUM: "VR005",
          }),
        ];

        // Only records matching firstName: "John" AND city: "Boston" AND houseNum: 123
        const matchingRecords = allRecords.filter(
          (record) =>
            record.firstName === "John" &&
            record.city === "Boston" &&
            record.houseNum === 123,
        );

        setupAuthenticatedTest();
        setupDatabaseMocks(matchingRecords, matchingRecords.length, prismaMock);

        const requestData = createValidRequestData(
          [
            { field: searchableFieldEnum.enum.firstName, value: "John" },
            { field: searchableFieldEnum.enum.city, value: "Boston" },
            { field: searchableFieldEnum.enum.houseNum, value: 123 },
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
              firstName: "JOHN",
              city: "Boston",
              houseNum: 123,
            },
            skip: 0,
            take: 10,
          },
          0,
          prismaMock,
        );
      });

      it("should handle hasEmail filtering with multiple records", async () => {
        // Arrange: Create records with mixed email status
        const allRecords = [
          createMockVoterRecord({
            firstName: "Alice",
            email: "alice@example.com",
            VRCNUM: "VR001",
          }),
          createMockVoterRecord({
            firstName: "Bob",
            email: null,
            VRCNUM: "VR002",
          }),
          createMockVoterRecord({
            firstName: "Charlie",
            email: "charlie@example.com",
            VRCNUM: "VR003",
          }),
          createMockVoterRecord({
            firstName: "Diana",
            email: "",
            VRCNUM: "VR004",
          }),
          createMockVoterRecord({
            firstName: "Eve",
            email: "eve@example.com",
            VRCNUM: "VR005",
          }),
        ];

        // Only records with hasEmail: true (non-null, non-empty email)
        const matchingRecords = allRecords.filter(
          (record) => record.email !== null && record.email !== "",
        );

        setupAuthenticatedTest();
        setupDatabaseMocks(matchingRecords, matchingRecords.length, prismaMock);

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
          data: matchingRecords.map(convertPrismaVoterRecordToAPI),
          totalRecords: matchingRecords.length,
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
