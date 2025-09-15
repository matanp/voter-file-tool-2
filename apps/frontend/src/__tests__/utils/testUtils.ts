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

// Mock response type
export interface MockResponse {
  status: number;
  json: () => Promise<unknown>;
}

// Mock data factories
export const createMockSession = (
  overrides: Partial<Session> = {},
): Session => ({
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    privilegeLevel: PrivilegeLevel.Admin,
    ...overrides.user,
  },
  privilegeLevel: PrivilegeLevel.Admin,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

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
): NextRequest => {
  const url = new URL("http://localhost:3000/api/test");

  // Add search params
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const request = new NextRequest(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return request;
};

// Test response helpers
export const expectSuccessResponse = <T = unknown>(
  response: MockResponse,
  expectedData?: T,
): void => {
  expect(response.status).toBe(200);
  if (expectedData) {
    void expect(response.json()).resolves.toEqual(expectedData);
  }
};

export const expectErrorResponse = (
  response: MockResponse,
  expectedStatus: number,
  expectedError?: string,
): void => {
  expect(response.status).toBe(expectedStatus);
  if (expectedError) {
    void expect(response.json()).resolves.toEqual({ error: expectedError });
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
    requestNotes?: string;
  } = {},
) => {
  const data: {
    committeeListId: number;
    requestNotes: string;
    addVoterRecordId?: string | null;
    removeVoterRecordId?: string | null;
  } = {
    committeeListId: overrides.committeeListId ?? 1,
    requestNotes: overrides.requestNotes ?? "Test request",
  };

  // Only add the fields if they are explicitly provided
  if (overrides.addVoterRecordId !== undefined) {
    data.addVoterRecordId = overrides.addVoterRecordId;
  }

  if (overrides.removeVoterRecordId !== undefined) {
    data.removeVoterRecordId = overrides.removeVoterRecordId;
  }

  return { data };
};
