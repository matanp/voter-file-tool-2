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
        const body =
          typeof options.body === "string"
            ? (() => {
                try {
                  return JSON.parse(options.body as string);
                } catch {
                  return {};
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
      status,
      headers: new Map([["location", url]]),
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
jest.mock("@prisma/client", () => ({
  ...jest.requireActual("@prisma/client"),
  Prisma: {
    ...jest.requireActual("@prisma/client").Prisma,
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(message: string, code: string) {
        super(message);
        this.name = "PrismaClientKnownRequestError";
        this.code = code;
      }
    },
  },
}));

// Mock utility functions
jest.mock("~/lib/utils", () => ({
  ...jest.requireActual("~/lib/utils"),
  hasPermissionFor: jest.fn(),
}));

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
globalThis.mockHasPermissionFor = jest.mocked(
  require("~/lib/utils").hasPermissionFor,
);
