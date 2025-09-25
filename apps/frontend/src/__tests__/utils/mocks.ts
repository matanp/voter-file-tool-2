import type { Session } from "next-auth";

// Convenience helpers to work with global mocks in a type-safe way

export function mockAuthSession(session: Session | null) {
  // Initialize Jest mock if absent
  if (!globalThis.mockAuth) {
    if (!globalThis.jest?.fn) {
      throw new Error(
        "Jest is not available in global scope. Ensure test setup runs before using mockAuthSession().",
      );
    }
    globalThis.mockAuth = globalThis.jest.fn() as jest.MockedFunction<
      () => Promise<Session | null>
    >;
  }

  // Type guard to ensure we have a proper mock
  const mockAuth = globalThis.mockAuth as
    | jest.MockedFunction<() => Promise<Session | null>>
    | undefined;

  if (!mockAuth || typeof mockAuth.mockResolvedValue !== "function") {
    throw new Error(
      "globalThis.mockAuth must be a Jest mock. Ensure test setup runs before using mockAuthSession().",
    );
  }
  mockAuth.mockResolvedValue(session);
}

export function mockHasPermission(granted: boolean) {
  if (!globalThis.mockHasPermissionFor) {
    if (!globalThis.jest?.fn) {
      throw new Error(
        "Jest is not available in global scope. Ensure test setup runs before using mockHasPermission().",
      );
    }
    globalThis.mockHasPermissionFor =
      globalThis.jest.fn() as jest.MockedFunction<
        (...args: unknown[]) => boolean
      >;
  }

  // Type guard to ensure we have a proper mock
  const mockHasPermissionFor = globalThis.mockHasPermissionFor as
    | jest.MockedFunction<(...args: unknown[]) => boolean>
    | undefined;

  if (!mockHasPermissionFor) {
    throw new Error(
      "globalThis.mockHasPermissionFor must be a Jest mock. Ensure test setup runs before using mockHasPermission().",
    );
  }
  mockHasPermissionFor.mockReturnValue(granted);
}

export const prismaMock = globalThis.mockPrisma;
