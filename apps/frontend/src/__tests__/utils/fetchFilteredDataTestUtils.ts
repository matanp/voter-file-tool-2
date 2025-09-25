import type { NextRequest } from "next/server";
import type { SearchQueryField } from "@voter-file-tool/shared-validators";
import {
  searchableFieldEnum,
  convertPrismaVoterRecordToAPI,
} from "@voter-file-tool/shared-validators";
import {
  fetchFilteredDataSchema,
  type FetchFilteredDataRequest,
} from "~/app/api/lib/utils";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  createMockVoterRecord,
  createMockRequest,
  expectSuccessResponse,
  expectErrorResponse,
} from "./testUtils";
import type { DeepMockProxy } from "jest-mock-extended";

// Type-safe Prisma mock call verification
type PrismaFindManyArgs = {
  where: Prisma.VoterRecordWhereInput;
  skip: number;
  take: number;
};

// Search query builders
export const createEmptySearchQuery = (): SearchQueryField[] => {
  return [];
};

export const createSearchQuery = (
  fields: Array<{
    field: keyof typeof searchableFieldEnum.enum;
    value: string | number | boolean | null;
  }>,
): SearchQueryField[] => {
  return fields.map(({ field, value }) => ({
    field: searchableFieldEnum.enum[field],
    value,
  }));
};

// Type-safe request data builders

export const createValidRequestData = (
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

// Invalid request data types and builders
type InvalidSearchQueryField = {
  field: string;
  value: unknown;
};

type InvalidRequestData = {
  searchQuery?: unknown;
  pageSize?: unknown;
  page?: unknown;
};

export const createInvalidSearchQueryField = (
  field: string,
  value: unknown,
): InvalidSearchQueryField => {
  return { field, value };
};

export const createInvalidRequestData = (
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

// Type alias for the Prisma mock
type PrismaMock = DeepMockProxy<PrismaClient>;

// Database mock setup helpers
export const setupDatabaseMocks = (
  records: ReturnType<typeof createMockVoterRecord>[],
  totalRecords: number,
  prismaMock: PrismaMock,
) => {
  prismaMock.voterRecord.findMany.mockResolvedValue(records);
  prismaMock.voterRecord.count.mockResolvedValue(totalRecords);
};

// Prisma call verification helpers
export const expectFindManyCalledWithSubset = (
  subset: Partial<PrismaFindManyArgs>,
  callIndex = 0,
  prismaMock: PrismaMock,
): void => {
  const call = prismaMock.voterRecord.findMany.mock.calls[callIndex]?.[0];
  expect(call).toMatchObject(subset);
};

// Test case interfaces for type safety
export interface PaginationTestCase {
  description: string;
  pageSize: number;
  page: number;
  expectedSkip: number;
  totalRecords: number;
}

export interface SearchQueryTestCase {
  description: string;
  searchQuery: SearchQueryField[];
  expectedWhere: Prisma.VoterRecordWhereInput;
  mockRecords: ReturnType<typeof createMockVoterRecord>[];
  expectedTotal: number;
  expectAndConditions?: boolean;
}

export interface FetchFilteredDataValidationTestCase {
  description: string;
  requestData: InvalidRequestData;
}

export interface DatabaseErrorTestCase {
  description: string;
  mockSetup: (prismaMock: PrismaMock) => void;
  expectedCalls: { findMany: boolean; count: boolean };
}

export interface DateConversionTestCase {
  description: string;
  mockData: {
    DOB: Date | null;
    lastUpdate: Date | null;
    originalRegDate: Date | null;
  };
  expectedData: {
    DOB: string | null;
    lastUpdate: string | null;
    originalRegDate: string | null;
  };
}

// Generic test runner helpers
export const runPaginationTest = async (
  testCase: PaginationTestCase,
  POST: (request: NextRequest) => Promise<Response>,
  setupAuthenticatedTest: () => void,
  prismaMock: PrismaMock,
) => {
  // Arrange
  const mockVoterRecords: ReturnType<typeof createMockVoterRecord>[] =
    Array.from({ length: testCase.pageSize }, (_, i) =>
      createMockVoterRecord({
        VRCNUM: `TEST${i.toString().padStart(6, "0")}`,
      }),
    );

  setupAuthenticatedTest();
  setupDatabaseMocks(mockVoterRecords, testCase.totalRecords, prismaMock);

  const requestData = createValidRequestData(
    createEmptySearchQuery(),
    testCase.pageSize,
    testCase.page,
  );

  const request = createMockRequest(requestData);

  // Act
  const response = await POST(request);

  // Assert
  await expectSuccessResponse(response, {
    data: mockVoterRecords.map(convertPrismaVoterRecordToAPI),
    totalRecords: testCase.totalRecords,
  });

  // Verify pagination calculation
  expectFindManyCalledWithSubset(
    {
      skip: testCase.expectedSkip,
      take: testCase.pageSize,
    },
    0,
    prismaMock,
  );
};

export const runSearchQueryTest = async (
  testCase: SearchQueryTestCase,
  POST: (request: NextRequest) => Promise<Response>,
  setupAuthenticatedTest: () => void,
  prismaMock: PrismaMock,
) => {
  // Arrange
  setupAuthenticatedTest();
  setupDatabaseMocks(testCase.mockRecords, testCase.expectedTotal, prismaMock);

  const requestData = createValidRequestData(testCase.searchQuery, 10, 1);
  const request = createMockRequest(requestData);

  // Act
  const response = await POST(request);

  // Assert
  await expectSuccessResponse(response, {
    data: testCase.mockRecords.map(convertPrismaVoterRecordToAPI),
    totalRecords: testCase.expectedTotal,
  });

  // Verify where clause
  const expectedWhereTyped: Prisma.VoterRecordWhereInput =
    testCase.expectedWhere;
  expectFindManyCalledWithSubset(
    {
      where: expectedWhereTyped,
      skip: 0,
      take: 10,
    },
    0,
    prismaMock,
  );

  if (testCase.expectAndConditions) {
    const query = prismaMock.voterRecord.findMany.mock.calls[0];
    const queryArgs = query?.[0] as { where?: { AND?: unknown } };
    expect(queryArgs?.where).toHaveProperty("AND");
    expect(Array.isArray(queryArgs?.where?.AND)).toBe(true);

    const andArray = Array.isArray(queryArgs?.where?.AND)
      ? queryArgs.where.AND
      : [];
    expect(andArray.length).toBeGreaterThan(0);

    const expectedEmailConditions: Prisma.VoterRecordWhereInput[] = [
      { email: { not: null } },
      { email: { not: "" } },
    ];
    expect(andArray).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          AND: expectedEmailConditions,
        }),
      ]),
    );
  }
};

export const runValidationTest = async (
  testCase: FetchFilteredDataValidationTestCase,
  POST: (request: NextRequest) => Promise<Response>,
  setupAuthMocks: () => void,
  prismaMock: PrismaMock,
) => {
  // Arrange
  setupAuthMocks();
  const request = createMockRequest(testCase.requestData);

  // Act
  const response = await POST(request);

  // Assert
  await expectErrorResponse(response, 422, "Invalid request data");
  expect(prismaMock.voterRecord.findMany).not.toHaveBeenCalled();
};

export const runDatabaseErrorTest = async (
  testCase: DatabaseErrorTestCase,
  POST: (request: NextRequest) => Promise<Response>,
  setupAuthenticatedTest: () => void,
  prismaMock: PrismaMock,
) => {
  // Arrange
  setupAuthenticatedTest();
  testCase.mockSetup(prismaMock);

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
    testCase.expectedCalls.findMany ? 1 : 0,
  );
  expect(prismaMock.voterRecord.count).toHaveBeenCalledTimes(
    testCase.expectedCalls.count ? 1 : 0,
  );
};

export const runDateConversionTest = async (
  testCase: DateConversionTestCase,
  POST: (request: NextRequest) => Promise<Response>,
  setupAuthenticatedTest: () => void,
  prismaMock: PrismaMock,
) => {
  // Arrange
  const mockRecord = createMockVoterRecord(testCase.mockData);
  setupAuthenticatedTest();
  setupDatabaseMocks([mockRecord], 1, prismaMock);

  const requestData = createValidRequestData(createEmptySearchQuery(), 10, 1);

  const request = createMockRequest(requestData);

  // Act
  const response = await POST(request);

  // Assert
  const responseData = (await response.json()) as {
    data: Array<{
      DOB: string | null;
      lastUpdate: string | null;
      originalRegDate: string | null;
    }>;
    totalRecords: number;
  };
  expect(responseData.totalRecords).toBe(1);
  expect(responseData.data).toHaveLength(1);

  // Verify date field conversion specifically
  const actualRecord = responseData.data[0]!;
  expect(actualRecord.DOB).toBe(testCase.expectedData.DOB);
  expect(actualRecord.lastUpdate).toBe(testCase.expectedData.lastUpdate);
  expect(actualRecord.originalRegDate).toBe(
    testCase.expectedData.originalRegDate,
  );
};
