import { NextRequest } from "next/server";
import type { RequestInit as NextRequestInit } from "next/dist/server/web/spec-extension/request";
import {
  type Prisma,
  PrivilegeLevel,
  type CommitteeList,
  type VoterRecord,
  type CommitteeRequest,
  type CommitteeGovernanceConfig,
} from "@prisma/client";
import type { Session } from "next-auth";
import {
  committeeDataSchema,
  type CommitteeData,
  removeCommitteeDataSchema,
  type RemoveCommitteeData,
} from "~/lib/validations/committee";

type CommitteeValidationTestCase = {
  field: keyof CommitteeData;
  value: string;
  expectedError: string;
};

// Mock response type
export type MockResponse<T = unknown> = Pick<Response, "status" | "json"> & {
  json: () => Promise<T>;
};

/** Creates a Response-like object for mocking fetch. Typed to satisfy Response usage. */
export function mockJsonResponse<T>(
  data: T,
  init: {
    status?: number;
    contentType?: string;
    statusText?: string;
    /** Override json() e.g. to simulate rejection. */
    json?: () => Promise<unknown>;
    /** Set body for 200 responses with non-JSON content-type (avoids 204/empty fallback). */
    body?: unknown;
  } = {},
): Pick<Response, "ok" | "status" | "statusText" | "headers" | "json"> & {
  json: () => Promise<unknown>;
  body: unknown;
} {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText:
      init.statusText ??
      (ok ? "OK" : status === 400 ? "Bad Request" : status === 500 ? "Internal Server Error" : status === 503 ? "Service Unavailable" : "Error"),
    headers: new Headers({
      "content-type": init.contentType ?? "application/json",
    }),
    json: init.json ?? (() => Promise.resolve(data)),
    body: init.body ?? {},
  };
}

/** Creates a 204 No Content response. */
export function mock204Response(): Pick<
  Response,
  "ok" | "status" | "statusText" | "headers"
> & { body: null } {
  return {
    ok: true,
    status: 204,
    statusText: "No Content",
    headers: new Headers(),
    body: null,
  };
}

/** Parse response JSON with type assertion. Use for test assertions. */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const raw = (await response.json()) as unknown;
  return raw as T;
}

/** Common error response body shape for typed assertions. */
export type ErrorResponseBody = { error: string };

// Mock data factories
export const createMockSession = (
  overrides: Partial<Session> = {},
): Session => {
  const { user: userOverrides, ...restOverrides } = overrides;
  return {
    user: {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      privilegeLevel: PrivilegeLevel.Admin,
      ...userOverrides,
    },
    privilegeLevel: PrivilegeLevel.Admin,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...restOverrides,
  };
};

export const createMockCommitteeData = (
  overrides: Partial<CommitteeData> = {},
  validate = true,
): CommitteeData => {
  const data = {
    cityTown: "Test City",
    legDistrict: 1,
    electionDistrict: 1,
    memberId: "TEST123456",
    ...overrides,
  };

  // Only validate if requested (for valid test data)
  if (validate) {
    return committeeDataSchema.parse(data);
  }

  // Return unvalidated data for invalid test cases
  return data as CommitteeData;
};

/** SRS 2.5 — Valid remove-committee request body (removalReason required). */
export const createMockRemoveCommitteeData = (
  overrides: Partial<RemoveCommitteeData> = {},
  validate = true,
): RemoveCommitteeData => {
  const data: RemoveCommitteeData = {
    cityTown: "Test City",
    legDistrict: 1,
    electionDistrict: 1,
    memberId: "TEST123456",
    removalReason: "PARTY_CHANGE",
    ...overrides,
  };
  if (validate) {
    return removeCommitteeDataSchema.parse(data);
  }
  return data;
};

/** CommitteeList with included committeeMemberList (for findUnique with include) */
export type CommitteeListWithMembers = CommitteeList & {
  committeeMemberList: VoterRecord[];
};

// ---------------------------------------------------------------------------
// CommitteeMembership mock helpers (pre-migration: not yet in PrismaClient)
// ---------------------------------------------------------------------------

/** Shape of a CommitteeMembership record returned by Prisma (pre-migration stub). */
export type MockMembership = {
  id: string;
  voterRecordId: string;
  committeeListId: number;
  termId: string;
  /** MembershipStatus enum value — string until `prisma generate` runs. */
  status: string;
  membershipType: string | null;
  seatNumber: number | null;
  submittedAt: Date;
  confirmedAt: Date | null;
  activatedAt: Date | null;
  resignedAt: Date | null;
  removedAt: Date | null;
  rejectedAt: Date | null;
  rejectionNote: string | null;
  submittedById: string | null;
  submissionMetadata: Record<string, unknown> | null;
  meetingRecordId: string | null;
  resignationDateReceived: Date | null;
  resignationMethod: string | null;
  removalReason: string | null;
  removalNotes: string | null;
  petitionVoteCount: number | null;
  petitionPrimaryDate: Date | null;
};

export const createMockMembership = (
  overrides: Partial<MockMembership> = {},
): MockMembership => ({
  id: "membership-test-id-001",
  voterRecordId: "TEST123456",
  committeeListId: 1,
  termId: DEFAULT_ACTIVE_TERM_ID,
  status: "SUBMITTED",
  membershipType: null,
  seatNumber: null,
  submittedAt: new Date("2024-01-01"),
  confirmedAt: null,
  activatedAt: null,
  resignedAt: null,
  removedAt: null,
  rejectedAt: null,
  rejectionNote: null,
  submittedById: "test-user-id",
  submissionMetadata: null,
  meetingRecordId: null,
  resignationDateReceived: null,
  resignationMethod: null,
  removalReason: null,
  removalNotes: null,
  petitionVoteCount: null,
  petitionPrimaryDate: null,
  ...overrides,
});

/** Typed mock model accessor for committeeMembership (pre-migration cast helper). */
type MockMembershipModel = {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
};

/**
 * Access prismaMock.committeeMembership with a pre-migration type cast.
 * After `prisma generate` runs post-migration, replace with direct access.
 */
export const getMembershipMock = (mock: unknown): MockMembershipModel =>
  (mock as { committeeMembership: MockMembershipModel }).committeeMembership;

/** Typed mock model accessor for auditLog (pre-migration cast helper). */
type MockAuditLogModel = {
  create: jest.Mock;
};

/**
 * Access prismaMock.auditLog with a pre-migration type cast.
 * After `prisma generate` runs post-migration, replace with direct access.
 */
export const getAuditLogMock = (mock: unknown): MockAuditLogModel =>
  (mock as { auditLog: MockAuditLogModel }).auditLog;

/** Wraps expect.objectContaining so the result is typed as unknown (avoids no-unsafe-assignment). */
function objectContainingMatcher<T extends object>(obj: T): unknown {
  return expect.objectContaining(obj) as unknown;
}

/** Wraps expect.arrayContaining so the result is typed as unknown (avoids no-unsafe-assignment). */
function arrayContainingMatcher(items: unknown[]): unknown {
  return expect.arrayContaining(items) as unknown;
}

/** Jest "anything" matcher wrapped to return unknown (avoids no-unsafe-assignment). */
export function expectAnything(): unknown {
  return expect.anything();
}

/**
 * Typed matcher for prisma.committeeMembership.update calls.
 * Uses Prisma-generated CommitteeMembershipUpdateInput (schema is source of truth).
 */
export function expectMembershipUpdate(
  data: Partial<Prisma.CommitteeMembershipUpdateInput>,
  where?: { id: string },
): unknown {
  if (where) {
    return objectContainingMatcher({
      where,
      data: objectContainingMatcher(data),
    });
  }
  return objectContainingMatcher({
    data: objectContainingMatcher(data),
  });
}

/**
 * Typed matcher for prisma.committeeMembership.create calls.
 * Accepts partial create input (voterRecordId, committeeListId, etc.).
 */
export function expectMembershipCreate(
  data: Partial<Prisma.CommitteeMembershipCreateInput> & Record<string, unknown>,
): unknown {
  return objectContainingMatcher({
    data: objectContainingMatcher(data),
  });
}

/**
 * Typed matcher for prisma.auditLog.create calls (SRS 1.5b).
 */
export function expectAuditLogCreate(
  data: Partial<Prisma.AuditLogCreateInput> & Record<string, unknown>,
): unknown {
  return objectContainingMatcher({
    data: objectContainingMatcher(data),
  });
}

/**
 * Typed matcher for prisma.seat.createMany calls.
 * Accepts array of partial SeatCreateManyInput items (checked via arrayContaining).
 */
export function expectSeatCreateMany(args: {
  data: Array<Partial<Prisma.SeatCreateManyInput>>;
}): unknown {
  const itemMatchers = args.data.map((item) => objectContainingMatcher(item));
  return objectContainingMatcher({
    data: arrayContainingMatcher(itemMatchers),
  });
}

/**
 * Typed matcher for prisma.seat.updateMany calls.
 * data accepts Partial<SeatUpdateManyMutationInput> or matchers (e.g. expectAnything()).
 */
export function expectSeatUpdateMany(args: {
  where: { committeeListId: number };
  data: Record<string, unknown>;
}): unknown {
  return objectContainingMatcher({
    where: args.where,
    data: objectContainingMatcher(args.data),
  });
}

/** Default term ID used in tests (matches migration seed). */
export const DEFAULT_ACTIVE_TERM_ID = "term-default-2024-2026";

export const createMockCommittee = (
  overrides: Partial<CommitteeListWithMembers> = {},
): CommitteeListWithMembers =>
  ({
    id: 1,
    cityTown: "Test City",
    legDistrict: 1,
    electionDistrict: 1,
    termId: DEFAULT_ACTIVE_TERM_ID,
    committeeMemberList: [createMockVoterRecord()],
    ...overrides,
  }) as CommitteeListWithMembers;

export const createMockVoterRecord = (
  overrides: Partial<VoterRecord> = {},
): VoterRecord =>
  ({
    VRCNUM: "TEST123456",
    latestRecordEntryYear: 2024,
    latestRecordEntryNumber: 1,
    firstName: "John",
    lastName: "Doe",
    committeeId: 1,
    // Optional fields with sensible defaults for testing
    street: "123 Test St",
    city: "Test City",
    state: "NY",
    zipCode: "12345",
    party: "DEM",
    countyLegDistrict: "1",
    stateAssmblyDistrict: "1",
    stateSenateDistrict: "1",
    congressionalDistrict: "1",
    townCode: "001",
    electionDistrict: 1,
    ...overrides,
  }) as VoterRecord;

export const createMockCommitteeRequest = (
  overrides: Partial<CommitteeRequest> = {},
): CommitteeRequest =>
  ({
    id: 1,
    committeeListId: 1,
    addVoterRecordId: "TEST123456",
    removeVoterRecordId: null,
    requestNotes: "Test request",
    ...overrides,
  }) as CommitteeRequest;

export const createMockGovernanceConfig = (
  overrides: Partial<CommitteeGovernanceConfig> = {},
): CommitteeGovernanceConfig =>
  ({
    id: "mcdc-default",
    requiredPartyCode: "DEM",
    maxSeatsPerLted: 4,
    requireAssemblyDistrictMatch: true,
    nonOverridableIneligibilityReasons: [],
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  }) as CommitteeGovernanceConfig;

/**
 * Mocks Prisma so validateEligibility passes (SRS §2.1): voter exists with matching party/AD,
 * crosswalk matches, under capacity, not in another committee.
 * Use in committee add/requestAdd/handleRequest tests. For requestAdd, override
 * committeeList.findUnique with an implementation that returns the committee for the route's
 * composite-key lookup and list fields for eligibility's id lookup.
 */
export function setupEligibilityPass(prismaMock: unknown): void {
  (
    prismaMock as { voterRecord: { findUnique: jest.Mock } }
  ).voterRecord.findUnique.mockResolvedValue(
    createMockVoterRecord({ party: "DEM", stateAssmblyDistrict: "1" }),
  );
  (
    prismaMock as { committeeList: { findUnique: jest.Mock } }
  ).committeeList.findUnique.mockResolvedValue({
    cityTown: "Test City",
    legDistrict: 1,
    electionDistrict: 1,
  });
  (
    prismaMock as { ltedDistrictCrosswalk: { findUnique: jest.Mock } }
  ).ltedDistrictCrosswalk.findUnique.mockResolvedValue({
    stateAssemblyDistrict: "1",
  });
  getMembershipMock(prismaMock).count.mockResolvedValue(0);
  getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
}

// Test request factory
export const createMockRequest = <T = Record<string, unknown>>(
  body: T = {} as T,
  searchParams: Record<string, string> = {},
  options: {
    method?: string;
    headers?: Record<string, string>;
  } = {},
): NextRequest => {
  const url = new URL("http://localhost:3000/api/test");

  // Add search params
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const method = options.method ?? "POST";
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  // Only include body for non-GET/HEAD requests
  const requestInit: NextRequestInit = {
    method,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  if (method !== "GET" && method !== "HEAD") {
    try {
      requestInit.body = JSON.stringify(body);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Request body is not serializable: ${errorMessage}`);
    }
  }

  const request = new NextRequest(url, requestInit);

  return request;
};

// Test response helpers
export const expectSuccessResponse = async <
  T extends Record<string, unknown> | unknown[] = Record<string, unknown>,
>(
  response: MockResponse<T>,
  expectedData?: T,
  expectedStatus = 200,
): Promise<void> => {
  expect(response.status).toBe(expectedStatus);
  if (expectedData !== undefined) {
    const json = (await response.json()) as unknown as T;
    expect(json).toEqual(expectedData);
  }
};

export const expectErrorResponse = async (
  response: MockResponse,
  expectedStatus: number,
  expectedError?: string,
): Promise<void> => {
  expect(response.status).toBe(expectedStatus);
  if (expectedError !== undefined) {
    const json = (await response.json()) as unknown as Record<string, unknown>;

    // Validate response structure
    if (typeof json !== "object" || json === null) {
      throw new Error("Response is not a valid JSON object");
    }

    if (!("error" in json) || typeof json.error !== "string") {
      throw new Error("Response does not contain a valid error field");
    }

    expect(json.error).toBe(expectedError);

    // For validation errors (422 status with "Invalid request data"), expect success: false
    if (expectedStatus === 422 && expectedError === "Invalid request data") {
      if (!("success" in json) || typeof json.success !== "boolean") {
        throw new Error("Response does not contain a valid success field");
      }
      expect(json.success).toBe(false);
    }
  }
};

// Prisma query object helpers

/**
 * Expected args for `prisma.committeeList.findUnique` in the fetchCommitteeList route (SRS 1.2).
 * Returns active memberships with voterRecord included.
 */
export const createCommitteeFindUniqueArgs = (
  overrides: {
    cityTown?: string;
    legDistrict?: number;
    electionDistrict?: number;
    termId?: string;
  } = {},
) => {
  const termId = overrides.termId ?? DEFAULT_ACTIVE_TERM_ID;
  return {
    where: {
      cityTown_legDistrict_electionDistrict_termId: {
        cityTown: overrides.cityTown ?? "Test City",
        legDistrict: overrides.legDistrict ?? 1,
        electionDistrict: overrides.electionDistrict ?? 1,
        termId,
      },
    },
    include: {
      memberships: {
        where: { status: "ACTIVE", termId },
        include: { voterRecord: true },
      },
      seats: { orderBy: { seatNumber: "asc" } },
    },
  };
};

/** Where clause only, for routes that don't use include (e.g. remove). */
export const createCommitteeFindUniqueWhereArgs = (
  overrides: {
    cityTown?: string;
    legDistrict?: number;
    electionDistrict?: number;
    termId?: string;
  } = {},
) => ({
  where: {
    cityTown_legDistrict_electionDistrict_termId: {
      cityTown: overrides.cityTown ?? "Test City",
      legDistrict: overrides.legDistrict ?? 1,
      electionDistrict: overrides.electionDistrict ?? 1,
      termId: overrides.termId ?? DEFAULT_ACTIVE_TERM_ID,
    },
  },
});

/**
 * Expected args for `prisma.committeeList.upsert` in the add route (SRS 1.2).
 * The member connection is now handled separately via CommitteeMembership.create,
 * so the upsert only creates/finds the CommitteeList record.
 */
export const createCommitteeUpsertArgs = (
  overrides: {
    cityTown?: string;
    legDistrict?: number;
    electionDistrict?: number;
    termId?: string;
  } = {},
) => ({
  where: {
    cityTown_legDistrict_electionDistrict_termId: {
      cityTown: overrides.cityTown ?? "Test City",
      legDistrict: overrides.legDistrict ?? 1,
      electionDistrict: overrides.electionDistrict ?? 1,
      termId: overrides.termId ?? DEFAULT_ACTIVE_TERM_ID,
    },
  },
  update: {},
  create: {
    cityTown: overrides.cityTown ?? "Test City",
    legDistrict: overrides.legDistrict ?? 1,
    electionDistrict: overrides.electionDistrict ?? 1,
    termId: overrides.termId ?? DEFAULT_ACTIVE_TERM_ID,
  },
});

export const createVoterRecordUpdateArgs = (
  overrides: {
    memberId?: string;
    committeeId?: number | null;
  } = {},
) => ({
  where: { VRCNUM: overrides.memberId ?? "TEST123456" },
  data: {
    committeeId: overrides.committeeId ?? null,
  },
});

export const createCommitteeRequestCreateArgs = (
  overrides: {
    committeeListId?: number;
    addVoterRecordId?: string | null | undefined;
    removeVoterRecordId?: string | null | undefined;
    requestNotes?: string | undefined;
  } = {},
) => {
  return {
    data: {
      committeeListId: overrides.committeeListId ?? 1,
      ...(overrides.addVoterRecordId !== undefined && {
        addVoterRecordId: overrides.addVoterRecordId,
      }),
      ...(overrides.removeVoterRecordId !== undefined && {
        removeVoterRecordId: overrides.removeVoterRecordId,
      }),
      ...(overrides.requestNotes !== undefined && {
        requestNotes: overrides.requestNotes,
      }),
    },
  };
};

// Shared validation test data
export const validationTestCases: {
  missingFields: CommitteeValidationTestCase[];
  invalidNumeric: CommitteeValidationTestCase[];
  invalidElectionDistrict: CommitteeValidationTestCase[];
  invalidRequestNotes: Array<{
    field: "requestNotes";
    value: string;
    expectedError: string;
  }>;
} = {
  missingFields: [
    { field: "cityTown", value: "", expectedError: "Invalid request data" },
    { field: "legDistrict", value: "", expectedError: "Invalid request data" },
    {
      field: "electionDistrict",
      value: "",
      expectedError: "Invalid request data",
    },
    { field: "memberId", value: "", expectedError: "Invalid request data" },
  ],
  invalidNumeric: [
    {
      field: "legDistrict",
      value: "invalid",
      expectedError: "Invalid request data",
    },
    {
      field: "legDistrict",
      value: "1.5",
      expectedError: "Invalid request data",
    },
    {
      field: "legDistrict",
      value: "-1",
      expectedError: "Invalid request data",
    },
    {
      field: "legDistrict",
      value: "0",
      expectedError: "Invalid request data",
    },
  ],
  invalidElectionDistrict: [
    {
      field: "electionDistrict",
      value: "1.5",
      expectedError: "Invalid request data",
    },
    {
      field: "electionDistrict",
      value: "invalid",
      expectedError: "Invalid request data",
    },
    {
      field: "electionDistrict",
      value: "-1",
      expectedError: "Invalid request data",
    },
  ],
  invalidRequestNotes: [
    {
      field: "requestNotes",
      value: "a".repeat(1001),
      expectedError: "Invalid request data",
    },
  ],
};

// Shared authentication test data
export const authTestCases = {
  unauthenticated: {
    session: null,
    expectedStatus: 401,
    expectedError: "Please log in",
  },
  insufficientPrivileges: [
    {
      privilegeLevel: PrivilegeLevel.ReadAccess,
      expectedStatus: 403,
      expectedError: "User does not have sufficient privilege",
    },
    {
      privilegeLevel: PrivilegeLevel.RequestAccess,
      expectedStatus: 403,
      expectedError: "User does not have sufficient privilege",
    },
  ],
};

/** Privilege level or "Authenticated" (any valid session, no privilege check). */
export type AuthLevel = PrivilegeLevel | "Authenticated";

// Authentication test configuration types
export interface AuthTestConfig {
  endpointName: string;
  requiredPrivilege: AuthLevel;
  mockRequest: () => NextRequest;
  mockData?: Record<string, unknown>;
}

export interface AuthTestCase {
  description: string;
  session: Session | null;
  hasPermission: boolean;
  expectedStatus: number;
  expectedError: string;
}

// Authentication test case generators
export const createUnauthenticatedTestCase = (): AuthTestCase => ({
  description: "should return 401 when user is not authenticated",
  session: null,
  hasPermission: false,
  expectedStatus: 401,
  expectedError: "Please log in",
});

export const createInsufficientPrivilegeTestCases = (
  requiredPrivilege: PrivilegeLevel,
): AuthTestCase[] => {
  const insufficientLevels = Object.values(PrivilegeLevel).filter(
    (level) => level !== requiredPrivilege && level !== PrivilegeLevel.Admin,
  );

  return insufficientLevels.map((privilegeLevel) => ({
    description: `should return 403 when user has ${privilegeLevel} privileges but needs ${requiredPrivilege}`,
    session: createMockSession({ user: { privilegeLevel } }),
    hasPermission: false,
    expectedStatus: 403,
    expectedError: "User does not have sufficient privilege",
  }));
};

export const createAuthenticatedTestCase = (
  privilegeLevel: PrivilegeLevel = PrivilegeLevel.Admin,
  successStatus = 200,
): AuthTestCase => ({
  description: `should succeed when user has ${privilegeLevel} privileges`,
  session: createMockSession({ user: { privilegeLevel } }),
  hasPermission: true,
  expectedStatus: successStatus,
  expectedError: "",
});

// Shared authentication test runner
export const runAuthTest = async (
  testCase: AuthTestCase,
  handler: (request: NextRequest) => Promise<Response>,
  mockRequest: NextRequest,
  mockAuthSession: (session: Session | null) => void,
  mockHasPermission: (granted: boolean) => void,
  setupMocks?: () => void,
): Promise<void> => {
  // Arrange
  mockAuthSession(testCase.session);
  mockHasPermission(testCase.hasPermission);

  // Setup additional mocks for successful cases if provided
  if (
    testCase.expectedStatus >= 200 &&
    testCase.expectedStatus < 300 &&
    setupMocks
  ) {
    setupMocks();
  }

  // Act
  const response = await handler(mockRequest);

  // Assert
  if (testCase.expectedStatus >= 200 && testCase.expectedStatus < 300) {
    await expectSuccessResponse(response, undefined, testCase.expectedStatus);
  } else {
    await expectErrorResponse(
      response,
      testCase.expectedStatus,
      testCase.expectedError,
    );
  }
};

// Parameterized authentication test suite generator
export const createAuthTestSuite = (
  config: AuthTestConfig,
  handler: (request: NextRequest) => Promise<Response>,
  mockAuthSession: (session: Session | null) => void,
  mockHasPermission: (granted: boolean) => void,
  setupMocks?: () => void,
  successStatus = 200,
): Array<{
  description: string;
  testCase: AuthTestCase;
  runTest: () => Promise<void>;
}> => {
  const insufficientCases =
    config.requiredPrivilege === "Authenticated"
      ? []
      : createInsufficientPrivilegeTestCases(config.requiredPrivilege);
  const successPrivilege =
    config.requiredPrivilege === "Authenticated"
      ? PrivilegeLevel.ReadAccess
      : config.requiredPrivilege;
  const testCases: AuthTestCase[] = [
    createUnauthenticatedTestCase(),
    ...insufficientCases,
    createAuthenticatedTestCase(successPrivilege, successStatus),
  ];

  return testCases.map((testCase) => ({
    description: testCase.description,
    testCase,
    runTest: () =>
      runAuthTest(
        testCase,
        handler,
        config.mockRequest(),
        mockAuthSession,
        mockHasPermission,
        setupMocks,
      ),
  }));
};

// Helper function to create parameterized validation tests
export const createValidationTestSuite = (
  testCases: CommitteeValidationTestCase[],
  createInvalidData: (
    field: keyof CommitteeData,
    value: string,
  ) => Partial<CommitteeData>,
  expectedStatus = 422,
) => {
  return testCases.map(({ field, value, expectedError }) => ({
    description: `missing or invalid ${field}`,
    requestData: createInvalidData(field, value),
    expectedStatus,
    expectedError,
  }));
};

// Helper function to parse numeric values consistently in tests
export const parseNumericValue = (value: string | number): number => {
  if (typeof value === "number") {
    return value;
  }
  return parseInt(value, 10);
};
