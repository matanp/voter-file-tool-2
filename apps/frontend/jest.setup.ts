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

// Mock @prisma/client to provide error classes
jest.mock("@prisma/client", () => {
  const actual: typeof PrismaClientModule =
    jest.requireActual("@prisma/client");
  return {
    ...actual,
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
});
