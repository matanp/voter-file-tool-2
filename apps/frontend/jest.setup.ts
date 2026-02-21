// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

import "@testing-library/jest-dom";
import { mockDeep, mockReset } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import type * as PrismaClientModule from "@prisma/client";
import type { Session } from "next-auth";
import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";
import type * as UtilsModule from "~/lib/utils";

// Mock Next.js modules
jest.mock("next/server", () => ({
  NextRequest: jest.fn().mockImplementation(
    (
      url: string,
      options: {
        body?: unknown;
        method?: string;
        headers?: Record<string, string>;
      } = {},
    ) => {
      const u = new URL(url, "http://localhost");
      const headers = new Headers(options.headers ?? {});
      const body: unknown =
        typeof options.body === "string"
          ? (() => {
              try {
                return JSON.parse(options.body) as unknown;
              } catch {
                return {} as unknown;
              }
            })()
          : (options.body ?? {});
      return {
        url: u.href,
        method: options.method ?? "GET",
        headers,
        nextUrl: {
          searchParams: u.searchParams,
        },
        json: () => Promise.resolve(body),
      };
    },
  ),
  NextResponse: {
    json: jest.fn(
      (
        data: unknown,
        init?: { status?: number; headers?: Record<string, string> },
      ) => {
        const status = init?.status ?? 200;
        const headers = new Headers(
          init?.headers ?? { "content-type": "application/json" },
        );
        return {
          status,
          ok: status >= 200 && status < 300,
          headers,
          json: async () => data,
          text: async () => JSON.stringify(data),
        };
      },
    ),
    redirect: jest.fn(
      (url: string, init?: { status?: number }) => ({
        status: init?.status ?? 307,
        headers: new Headers([["location", url]]),
      }),
    ),
  },
}));

// Mock Next.js auth
jest.mock("~/auth", () => ({
  auth: jest.fn(),
}));

// Mock Prisma client with jest-mock-extended for type safety
const prismaMock = mockDeep<PrismaClient>();

jest.mock("~/lib/prisma", () => ({
  __esModule: true,
  default: prismaMock,
}));

// Mock @prisma/client to provide error classes and pre-migration enum stubs
jest.mock("@prisma/client", () => {
  const actual: typeof PrismaClientModule =
    jest.requireActual("@prisma/client");
  return {
    ...actual,
    // Pre-migration enum stubs — remove after `prisma migrate dev && prisma generate`
    RemovalReason: {
      PARTY_CHANGE: "PARTY_CHANGE",
      MOVED_OUT_OF_DISTRICT: "MOVED_OUT_OF_DISTRICT",
      INACTIVE_REGISTRATION: "INACTIVE_REGISTRATION",
      DECEASED: "DECEASED",
      OTHER: "OTHER",
    },
    AuditAction: {
      MEMBER_SUBMITTED: "MEMBER_SUBMITTED",
      MEMBER_REJECTED: "MEMBER_REJECTED",
      MEMBER_CONFIRMED: "MEMBER_CONFIRMED",
      MEMBER_ACTIVATED: "MEMBER_ACTIVATED",
      MEMBER_RESIGNED: "MEMBER_RESIGNED",
      MEMBER_REMOVED: "MEMBER_REMOVED",
      PETITION_RECORDED: "PETITION_RECORDED",
      MEETING_CREATED: "MEETING_CREATED",
      REPORT_GENERATED: "REPORT_GENERATED",
      TERM_CREATED: "TERM_CREATED",
      JURISDICTION_ASSIGNED: "JURISDICTION_ASSIGNED",
      DISCREPANCY_RESOLVED: "DISCREPANCY_RESOLVED",
    },
    Prisma: {
      ...actual.Prisma,
      PrismaClientKnownRequestError: class extends Error {
        code: string;
        clientVersion?: string;
        meta?: unknown;
        constructor(
          message: string,
          opts: { code: string; clientVersion?: string; meta?: unknown },
        ) {
          super(message);
          this.name = "PrismaClientKnownRequestError";
          this.code = opts.code;
          this.clientVersion = opts.clientVersion;
          this.meta = opts.meta;
        }
      },
    },
  };
});

// Mock utility functions
jest.mock("~/lib/utils", () => {
  const actual: typeof UtilsModule =
    jest.requireActual("~/lib/utils");
  return {
    ...actual,
    hasPermissionFor: jest.fn(),
  };
});

// Mock ResizeObserver for components that use it
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

global.ResizeObserver = MockResizeObserver as typeof ResizeObserver;

// Mock console.error to suppress error logs during tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Global test utilities
globalThis.mockPrisma = prismaMock;
const mockedAuth = jest.mocked(auth) as unknown as jest.MockedFunction<
  () => Promise<Session | null>
>;
globalThis.mockAuth = mockedAuth;
const mockedHasPermissionFor = jest.mocked(hasPermissionFor);
globalThis.mockHasPermissionFor = mockedHasPermissionFor;

// Default active term for committee tests (SRS §5.1)
const DEFAULT_ACTIVE_TERM = {
  id: "term-default-2024-2026",
  label: "2024–2026",
  startDate: new Date("2024-01-01"),
  endDate: new Date("2026-12-31"),
  isActive: true,
  createdAt: new Date(),
};

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock);
  mockedAuth.mockReset();
  mockedHasPermissionFor.mockReset();
  // Mock active term for routes that call getActiveTermId()
  (prismaMock.committeeTerm as { findFirst: jest.Mock }).findFirst =
    jest.fn().mockResolvedValue(DEFAULT_ACTIVE_TERM);
  // Mock governance config for routes that call getGovernanceConfig()
  (prismaMock.committeeGovernanceConfig as { findFirst: jest.Mock }).findFirst =
    jest.fn().mockResolvedValue({
      id: "mcdc-default",
      requiredPartyCode: "DEM",
      maxSeatsPerLted: 4,
      requireAssemblyDistrictMatch: true,
      nonOverridableIneligibilityReasons: [],
      updatedAt: new Date("2024-01-01"),
    });
  // Pre-migration: CommitteeMembership is not yet in PrismaClient types.
  // Inject a mock object so tests can access it via getMembershipMock(prismaMock).
  // After `prisma migrate dev && prisma generate`, this block can be removed.
  (
    prismaMock as unknown as {
      committeeMembership: {
        findUnique: jest.Mock;
        findFirst: jest.Mock;
        findMany: jest.Mock;
        count: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        updateMany: jest.Mock;
      };
      seat: {
        count: jest.Mock;
        findMany: jest.Mock;
        createMany: jest.Mock;
      };
      auditLog: {
        create: jest.Mock;
      };
    }
  ).committeeMembership = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]), // assignNextAvailableSeat: no occupied seats
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  (
    prismaMock as unknown as {
      seat: {
        count: jest.Mock;
        findMany: jest.Mock;
        findUnique: jest.Mock;
        createMany: jest.Mock;
        update: jest.Mock;
        updateMany: jest.Mock;
      };
    }
  ).seat = {
    count: jest.fn().mockResolvedValue(4), // ensureSeatsExist: already has max seats
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    createMany: jest.fn().mockResolvedValue({ count: 4 }),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 4 }),
  };
  (
    prismaMock as unknown as {
      auditLog: { create: jest.Mock };
    }
  ).auditLog = {
    create: jest.fn(),
  };
  (
    prismaMock as unknown as {
      eligibilityFlag: {
        findUnique: jest.Mock;
        findMany: jest.Mock;
        createMany: jest.Mock;
        update: jest.Mock;
      };
    }
  ).eligibilityFlag = {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    update: jest.fn(),
  };
  // SRS 2.4 — MeetingRecord mock
  (
    prismaMock as unknown as {
      meetingRecord: {
        findUnique: jest.Mock;
        findMany: jest.Mock;
        create: jest.Mock;
        count: jest.Mock;
      };
    }
  ).meetingRecord = {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  };
  (prismaMock.$transaction as jest.Mock).mockImplementation(
    async (arg: unknown): Promise<unknown> => {
      if (typeof arg === "function") {
        return (arg as (tx: PrismaClient) => Promise<unknown>)(prismaMock);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg as Promise<unknown>[]);
      }
      return arg;
    },
  );
});
