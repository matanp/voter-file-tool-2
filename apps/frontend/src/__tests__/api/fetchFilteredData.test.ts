import { POST } from "~/app/api/fetchFilteredData/route";
import { PrivilegeLevel, type Prisma } from "@prisma/client";
import {
  createMockSession,
  createMockVoterRecord,
  expectSuccessResponse,
  expectErrorResponse,
  createMockRequest,
  createAuthTestSuite,
  type AuthTestConfig,
} from "../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../utils/mocks";
import type { SearchQueryField } from "@voter-file-tool/shared-validators";
import {
  searchableFieldEnum,
  type SearchableField,
  NUMBER_FIELDS,
  BOOLEAN_FIELDS,
  STRING_FIELDS,
  convertPrismaVoterRecordToAPI,
  type VoterRecordAPI,
} from "@voter-file-tool/shared-validators";
import { fetchFilteredDataSchema } from "~/app/api/lib/utils";
import type { z } from "zod";

// Type-safe Prisma mock call verification
type PrismaFindManyArgs = {
  where: Prisma.VoterRecordWhereInput;
  skip: number;
  take: number;
};

// Strongly typed Jest objectContaining helper to avoid unsafe assignments at callsites
const typedObjectContaining = <T>(subset: Partial<T>): T => {
  return expect.objectContaining(subset) as unknown as T;
};

// Verify a subset of the Prisma findMany args
const expectFindManyCalledWithSubset = (
  subset: Partial<PrismaFindManyArgs>,
  callIndex = 0,
): void => {
  const call = prismaMock.voterRecord.findMany.mock.calls[callIndex]?.[0];
  expect(call).toMatchObject(subset);
};

const setupAuthenticatedTest = (privilegeLevel = PrivilegeLevel.ReadAccess) => {
  const mockSession = createMockSession({ user: { privilegeLevel } });
  mockAuthSession(mockSession);
  mockHasPermission(true);
  return mockSession;
};

const setupDatabaseMocks = (
  records: ReturnType<typeof createMockVoterRecord>[],
  totalRecords: number,
) => {
  prismaMock.voterRecord.findMany.mockResolvedValue(records);
  prismaMock.voterRecord.count.mockResolvedValue(totalRecords);
};
const createEmptySearchQuery = (): SearchQueryField[] => {
  return [];
};

// Separate type for invalid test data
type InvalidSearchQueryField = {
  field: string; // Allow any string for invalid tests
  value: unknown; // Allow any value for invalid tests
};

const createInvalidSearchQueryField = (
  field: string,
  value: unknown,
): InvalidSearchQueryField => {
  return { field, value };
};

// Type-safe request data builders
type FetchFilteredDataRequest = z.infer<typeof fetchFilteredDataSchema>;

// Type-safe valid request data creation with runtime validation
const createValidRequestData = (
  searchQuery: SearchQueryField[],
  pageSize: number,
  page: number,
): FetchFilteredDataRequest => {
  const result = fetchFilteredDataSchema.safeParse({
    searchQuery,
    pageSize,
    page,
  });

  if (!result.success) {
    throw new Error(`Invalid request data: ${result.error.message}`);
  }

  return result.data;
};

// Separate type for invalid request data
type InvalidRequestData = {
  searchQuery?: unknown;
  pageSize?: unknown;
  page?: unknown;
};

const createInvalidRequestData = (
  searchQuery: unknown,
  pageSize: unknown,
  page: unknown,
): InvalidRequestData => {
  return {
    searchQuery,
    pageSize,
    page,
  };
};

// Note: Direct expect.objectContaining() calls are used instead of helper functions
// to avoid TypeScript type inference issues with Jest expectations

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
      const paginationTestCases = [
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

      paginationTestCases.forEach(
        ({ description, pageSize, page, expectedSkip, totalRecords }) => {
          it(description, async () => {
            // Arrange
            const recordCount = Math.max(1, Math.min(pageSize, 10)); // Ensure at least 1 record
            const mockVoterRecords: ReturnType<typeof createMockVoterRecord>[] =
              Array.from({ length: recordCount }, (_, i) =>
                createMockVoterRecord({
                  VRCNUM: `TEST${i.toString().padStart(6, "0")}`,
                }),
              );

            setupAuthenticatedTest();
            setupDatabaseMocks(mockVoterRecords, totalRecords);

            const requestData = createValidRequestData(
              createEmptySearchQuery(),
              pageSize,
              page,
            );

            const request = createMockRequest(requestData);

            // Act
            const response = await POST(request);

            // Assert
            await expectSuccessResponse(response, {
              data: mockVoterRecords.map(convertPrismaVoterRecordToAPI),
              totalRecords,
            });

            // Verify pagination calculation (subset match; avoid brittleness)
            expectFindManyCalledWithSubset({
              skip: expectedSkip,
              take: pageSize,
            });
          });
        },
      );
    });

    describe("Search query tests", () => {
      const searchQueryTestCases = [
        {
          description: "should handle single field search",
          searchQuery: [{ field: "firstName" as const, value: "John" }],
          expectedWhere: { firstName: "JOHN" },
          mockRecords: [createMockVoterRecord({ firstName: "John" })],
          expectedTotal: 1,
        },
        {
          description: "should handle multiple field search",
          searchQuery: [
            { field: "firstName" as const, value: "John" },
            { field: "lastName" as const, value: "Doe" },
            { field: "city" as const, value: "Test City" },
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
          searchQuery: [{ field: "firstName" as const, value: "NonExistent" }],
          expectedWhere: { firstName: "NONEXISTENT" },
          mockRecords: [],
          expectedTotal: 0,
        },
        {
          description: "should handle different field types correctly",
          searchQuery: [
            { field: "houseNum" as const, value: 123 },
            { field: "hasEmail" as const, value: true },
            { field: "firstName" as const, value: "John" },
          ],
          expectedWhere: { firstName: "JOHN", houseNum: 123 },
          mockRecords: [createMockVoterRecord()],
          expectedTotal: 1,
          expectAndConditions: true,
        },
      ];

      searchQueryTestCases.forEach(
        ({
          description,
          searchQuery,
          expectedWhere,
          mockRecords,
          expectedTotal,
          expectAndConditions,
        }) => {
          it(description, async () => {
            // Arrange
            setupAuthenticatedTest();
            setupDatabaseMocks(mockRecords, expectedTotal);

            const requestData = createValidRequestData(searchQuery, 10, 1);

            const request = createMockRequest(requestData);

            // Act
            const response = await POST(request);

            // Assert
            await expectSuccessResponse(response, {
              data: mockRecords.map(convertPrismaVoterRecordToAPI),
              totalRecords: expectedTotal,
            });

            // Strongly type expected where clause
            const expectedWhereTyped: Prisma.VoterRecordWhereInput =
              expectedWhere;
            expectFindManyCalledWithSubset({
              where:
                typedObjectContaining<Prisma.VoterRecordWhereInput>(
                  expectedWhereTyped,
                ),
              skip: 0,
              take: 10,
            });

            if (expectAndConditions) {
              const query = prismaMock.voterRecord.findMany.mock.calls[0];
              expect(query?.[0]?.where).toHaveProperty("AND");
              expect(Array.isArray(query?.[0]?.where?.AND)).toBe(true);
              // Assert that hasEmail true produces the shared validators' AND conditions
              const andArray = (query?.[0]?.where?.AND ?? []) as unknown[];
              expect(andArray.length).toBeGreaterThan(0);
              // Ensure there's a condition that ensures email is not null and not empty
              expect(andArray).toEqual(
                expect.arrayContaining([
                  typedObjectContaining<Prisma.VoterRecordWhereInput>({
                    AND: expect.arrayContaining([
                      { email: { not: null } },
                      { email: { not: "" } },
                    ]) as unknown as Prisma.VoterRecordWhereInput[],
                  }),
                ]),
              );
            }
          });
        },
      );
    });

    describe("Validation tests", () => {
      // Setup authenticated session for validation tests
      const setupAuthMocks = () => {
        setupAuthenticatedTest();
      };

      // Parameterized validation test cases
      const validationTestCases = [
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
        // Additional validation safety: non-integer, negative, wrong-type, and missing fields
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
            "1" as unknown as number, // Intentionally wrong type passed in body to trigger runtime validation path
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

      validationTestCases.forEach(({ description, requestData }) => {
        it(description, async () => {
          // Arrange
          setupAuthMocks();
          const request = createMockRequest(requestData);

          // Act
          const response = await POST(request);

          // Assert
          await expectErrorResponse(response, 422, "Invalid request data");
          expect(prismaMock.voterRecord.findMany).not.toHaveBeenCalled();
        });
      });
    });

    describe("Database error handling", () => {
      const databaseErrorTestCases = [
        {
          description: "should return 500 for database error during findMany",
          mockSetup: () => {
            prismaMock.voterRecord.findMany.mockRejectedValue(
              new Error("Database connection failed"),
            );
          },
          expectedCalls: { findMany: true, count: false },
        },
        {
          description: "should return 500 for database error during count",
          mockSetup: () => {
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

      databaseErrorTestCases.forEach(
        ({ description, mockSetup, expectedCalls }) => {
          it(description, async () => {
            // Arrange
            setupAuthenticatedTest();
            mockSetup();

            const requestData = createValidRequestData(
              [
                {
                  field: searchableFieldEnum.enum.firstName,
                  value: "John",
                },
              ],
              10,
              1,
            );

            const request = createMockRequest(requestData);

            // Act
            const response = await POST(request);

            // Assert
            await expectErrorResponse(response, 500, "Internal Server Error");
            expect(prismaMock.voterRecord.findMany).toHaveBeenCalledTimes(
              expectedCalls.findMany ? 1 : 0,
            );
            expect(prismaMock.voterRecord.count).toHaveBeenCalledTimes(
              expectedCalls.count ? 1 : 0,
            );
          });
        },
      );
    });

    // Edge case tests for data conversion
    describe("Data conversion edge cases", () => {
      const testDate = new Date("2023-01-01T00:00:00.000Z");

      const dateConversionTestCases = [
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

      dateConversionTestCases.forEach(
        ({ description, mockData, expectedData }) => {
          it(description, async () => {
            // Arrange
            const mockRecord = createMockVoterRecord(mockData);
            setupAuthenticatedTest();
            setupDatabaseMocks([mockRecord], 1);

            const requestData = createValidRequestData(
              createEmptySearchQuery(),
              10,
              1,
            );

            const request = createMockRequest(requestData);

            // Act
            const response = await POST(request);

            // Assert
            const responseData = (await response.json()) as {
              data: Array<VoterRecordAPI>;
              totalRecords: number;
            };
            expect(responseData.totalRecords).toBe(1);
            expect(responseData.data).toHaveLength(1);

            // Verify date field conversion specifically
            const actualRecord = responseData.data[0]!;
            expect(actualRecord.DOB).toBe(expectedData.DOB);
            expect(actualRecord.lastUpdate).toBe(expectedData.lastUpdate);
            expect(actualRecord.originalRegDate).toBe(
              expectedData.originalRegDate,
            );
          });
        },
      );
    });
  });
});
