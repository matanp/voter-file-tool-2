import { NextRequest } from "next/server";
import {
  PrivilegeLevel,
  type CommitteeList,
  type VoterRecord,
  type CommitteeRequest,
} from "@prisma/client";
import type { Session } from "next-auth";
import {
  committeeDataSchema,
  type CommitteeData,
} from "~/lib/validations/committee";

// Validation test case types
type ValidationTestCase = {
  field: keyof CommitteeData;
  value: string;
  expectedError: string;
};

// Mock response type
export interface MockResponse<T = unknown> {
  status: number;
  json: () => Promise<T>;
}

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
    legDistrict: "1",
    electionDistrict: "1",
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

export const createMockCommittee = (
  overrides: Partial<
    CommitteeList & { committeeMemberList: VoterRecord[] }
  > = {},
): CommitteeList & { committeeMemberList: VoterRecord[] } => ({
  id: 1,
  cityTown: "Test City",
  legDistrict: 1,
  electionDistrict: 1,
  committeeMemberList: [createMockVoterRecord()],
  ...overrides,
});

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

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  const request = new NextRequest(url, {
    method: options.method ?? "POST",
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    body: JSON.stringify(body),
  });

  return request;
};

// Test response helpers
export const expectSuccessResponse = async <
  T extends Record<string, unknown> | unknown[] = Record<string, unknown>,
>(
  response: MockResponse,
  expectedData?: T,
  expectedStatus = 200,
): Promise<void> => {
  expect(response.status).toBe(expectedStatus);
  if (expectedData !== undefined) {
    const json = await response.json();
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
    const json = (await response.json()) as {
      error: string;
      details?: unknown;
    };
    expect(json.error).toBe(expectedError);
    // Only expect details for validation errors (422 status with "Invalid request data")
    if (expectedStatus === 422 && expectedError === "Invalid request data") {
      expect(json.details).toBeDefined();
    }
  }
};

// Prisma query object helpers
export const createCommitteeFindUniqueArgs = (
  overrides: {
    cityTown?: string;
    legDistrict?: number;
    electionDistrict?: number;
    include?: { committeeMemberList?: boolean };
  } = {},
) => {
  const args: {
    where: {
      cityTown_legDistrict_electionDistrict: {
        cityTown: string;
        legDistrict: number;
        electionDistrict: number;
      };
    };
    include?: {
      committeeMemberList: boolean;
    };
  } = {
    where: {
      cityTown_legDistrict_electionDistrict: {
        cityTown: overrides.cityTown ?? "Test City",
        legDistrict: overrides.legDistrict ?? 1,
        electionDistrict: overrides.electionDistrict ?? 1,
      },
    },
  };

  if (overrides.include?.committeeMemberList !== false) {
    args.include = {
      committeeMemberList: overrides.include?.committeeMemberList ?? true,
    };
  }

  return args;
};

export const createCommitteeUpsertArgs = (
  overrides: {
    cityTown?: string;
    legDistrict?: number;
    electionDistrict?: number;
    memberId?: string;
    include?: { committeeMemberList?: boolean };
  } = {},
) => ({
  where: {
    cityTown_legDistrict_electionDistrict: {
      cityTown: overrides.cityTown ?? "Test City",
      legDistrict: overrides.legDistrict ?? 1,
      electionDistrict: overrides.electionDistrict ?? 1,
    },
  },
  update: {
    committeeMemberList: {
      connect: { VRCNUM: overrides.memberId ?? "TEST123456" },
    },
  },
  create: {
    cityTown: overrides.cityTown ?? "Test City",
    legDistrict: overrides.legDistrict ?? 1,
    electionDistrict: overrides.electionDistrict ?? 1,
    committeeMemberList: {
      connect: { VRCNUM: overrides.memberId ?? "TEST123456" },
    },
  },
  include: {
    committeeMemberList: overrides.include?.committeeMemberList ?? true,
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
  missingFields: ValidationTestCase[];
  invalidNumeric: ValidationTestCase[];
  invalidElectionDistrict: ValidationTestCase[];
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

// Authentication test configuration types
export interface AuthTestConfig {
  endpointName: string;
  requiredPrivilege: PrivilegeLevel;
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
  const testCases: AuthTestCase[] = [
    createUnauthenticatedTestCase(),
    ...createInsufficientPrivilegeTestCases(config.requiredPrivilege),
    createAuthenticatedTestCase(config.requiredPrivilege, successStatus),
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
  testCases: ValidationTestCase[],
  createInvalidData: (
    field: keyof CommitteeData,
    value: string,
  ) => Partial<CommitteeData>,
  expectedStatus = 400,
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
