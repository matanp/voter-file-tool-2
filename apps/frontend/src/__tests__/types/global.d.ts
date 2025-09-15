/* eslint-disable no-var */
// Global type declarations for Jest mocks
import type { PrismaClient } from "@prisma/client";
import type { DeepMockProxy } from "jest-mock-extended";
import type { MockedFunction } from "jest-mock";
import type { Session } from "next-auth";

// Infer types of value exports without importing them as values
import type { auth } from "~/auth";
import type { hasPermissionFor } from "~/lib/utils";
type AuthFn = typeof auth;
type HasPermissionForFn = typeof hasPermissionFor;

declare global {
  var mockPrisma: DeepMockProxy<PrismaClient>;
  var mockAuth: MockedFunction<() => Promise<Session | null>>;
  var mockHasPermissionFor: MockedFunction<HasPermissionForFn>;
}

export {};
