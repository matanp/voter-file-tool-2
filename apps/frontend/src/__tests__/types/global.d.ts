/* eslint-disable no-var */
// Global type declarations for Jest mocks
import type { PrismaClient } from "@prisma/client";
import type { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

// Infer types of value exports without importing them as values
type AuthFn = typeof import("~/auth").auth;
type HasPermissionForFn = typeof import("~/lib/utils").hasPermissionFor;

declare global {
  var mockPrisma: DeepMockProxy<PrismaClient>;
  var mockAuth: jest.MockedFunction<() => Promise<Session | null>>;
  var mockHasPermissionFor: jest.MockedFunction<HasPermissionForFn>;

  // Jest global
  var jest: typeof import("@jest/globals").jest | undefined;
}

export {};
