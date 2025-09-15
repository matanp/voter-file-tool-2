/* eslint-disable no-var */
// Global type declarations for Jest mocks
import type { PrismaClient } from "@prisma/client";
import type { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

// Infer types of value exports without importing them as values
import type { auth } from "~/auth";
import type { hasPermissionFor } from "~/lib/utils";
import type { jest } from "@jest/globals";
type AuthFn = typeof auth;
type HasPermissionForFn = typeof hasPermissionFor;

declare global {
  var mockPrisma: DeepMockProxy<PrismaClient>;
  var mockAuth: jest.MockedFunction<() => Promise<Session | null>>;
  var mockHasPermissionFor: jest.MockedFunction<HasPermissionForFn>;

  // Jest global
  var jest: typeof jest;
}

export {};
