// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

import { mockDeep, mockReset } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { auth } from "~/auth";

// Mock Next.js modules
jest.mock("next/server", () => ({
  NextRequest: jest
    .fn()
    .mockImplementation(
      (url: string, options: { body?: string; method?: string } = {}) => {
        const mockRequest = {
          nextUrl: {
            searchParams: new URL(url).searchParams,
          },
          json: jest
            .fn()
            .mockResolvedValue(options.body ? JSON.parse(options.body) : {}),
          method: options.method ?? "GET",
        };
        return mockRequest;
      },
    ),
  NextResponse: {
    json: jest.fn((data: unknown, init?: { status?: number }) => ({
      json: () => Promise.resolve(data),
      status: init?.status ?? 200,
      ...init,
    })),
    redirect: jest.fn(),
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

// Mock utility functions
jest.mock("~/lib/utils", () => ({
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
globalThis.mockAuth = jest.mocked(auth);
globalThis.mockHasPermissionFor = jest.mocked(
  require("~/lib/utils").hasPermissionFor,
);
