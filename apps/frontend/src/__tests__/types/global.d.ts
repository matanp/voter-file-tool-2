/* eslint-disable no-var */
// Global type declarations for Jest mocks
import type { PrismaClient } from "@prisma/client";
import type { DeepMockProxy } from "jest-mock-extended";

// Import the actual functions to infer their types
import type { auth } from "~/auth";
import type { hasPermissionFor } from "~/lib/utils";

declare global {
  var mockPrisma: DeepMockProxy<PrismaClient>;
  var mockAuth: jest.MockedFunction<typeof auth>;
  var mockHasPermissionFor: jest.MockedFunction<typeof hasPermissionFor>;
}

export {};
