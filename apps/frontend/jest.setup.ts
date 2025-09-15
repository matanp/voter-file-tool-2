// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

import { mockDeep, mockReset } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "next-auth";
import { auth } from "~/auth";

// Mock Next.js modules
jest.mock("next/server", () => ({
  NextRequest: jest
    .fn()
    .mockImplementation(
      (url: string, options: { body?: unknown; method?: string } = {}) => {
        const u = new URL(url, "http://localhost");
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
        const headers = new Map(
          Object.entries(
            init?.headers ?? { "content-type": "application/json" },
          ),
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
    redirect: jest.fn((url: string, status = 307) => ({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      status,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-assignment
      headers: new Map([["location", url]]) as Map<string, string>,
    })),
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
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock("@prisma/client", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  ...jest.requireActual("@prisma/client"),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  Prisma: {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    ...jest.requireActual("@prisma/client").Prisma,
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(
        message: string,
        meta: { code: string; clientVersion?: string },
      ) {
        super(message);
        this.name = "PrismaClientKnownRequestError";
        this.code = meta.code;
      }
    },
  },
}));

// Mock utility functions
jest.mock("~/lib/utils", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return
  const actual = jest.requireActual("~/lib/utils");
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...actual,
    hasPermissionFor: jest.fn(),
  };
});

// Mock console.error to suppress error logs during tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock);
});

// Global test utilities
globalThis.mockPrisma = prismaMock;
globalThis.mockAuth = jest.mocked(auth) as unknown as jest.MockedFunction<
  () => Promise<Session | null>
>;
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
globalThis.mockHasPermissionFor = jest.mocked(
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  require("~/lib/utils").hasPermissionFor,
);
