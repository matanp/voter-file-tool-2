/* eslint-disable no-var */
// Global type declarations for Jest mocks
import type { PrismaClient } from "@prisma/client";
import type { DeepMockProxy } from "jest-mock-extended";
import type { MockedFunction } from "jest-mock";
import type { Session } from "next-auth";

// Infer types of value exports without importing them as values
import type { auth } from "~/auth";
import type { hasPermissionFor } from "~/lib/utils";
import type {
  useRequiresPrivilege,
  useIsAdmin,
  useIsDeveloper,
} from "~/hooks/useAuthorization";
type AuthFn = typeof auth;
type HasPermissionForFn = typeof hasPermissionFor;
type UseRequiresPrivilegeFn = typeof useRequiresPrivilege;
type UseIsAdminFn = typeof useIsAdmin;
type UseIsDeveloperFn = typeof useIsDeveloper;

declare global {
  var mockPrisma: DeepMockProxy<PrismaClient>;
  var mockAuth: MockedFunction<() => Promise<Session | null>>;
  var mockHasPermissionFor: MockedFunction<HasPermissionForFn>;
  var mockUseRequiresPrivilege: MockedFunction<UseRequiresPrivilegeFn>;
  var mockUseIsAdmin: MockedFunction<UseIsAdminFn>;
  var mockUseIsDeveloper: MockedFunction<UseIsDeveloperFn>;
}

export {};
