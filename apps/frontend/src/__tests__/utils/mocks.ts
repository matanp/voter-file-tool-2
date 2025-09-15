import type { Session } from "next-auth";

// Convenience helpers to work with global mocks in a type-safe way

export function mockAuthSession(session: Session | null) {
  // Initialize Jest mock if absent
  globalThis.mockAuth ||= globalThis.jest?.fn?.();
  if (
    !globalThis.mockAuth ||
    typeof globalThis.mockAuth.mockResolvedValue !== "function"
  ) {
    throw new Error(
      "globalThis.mockAuth must be a Jest mock. Ensure test setup runs before using mockAuthSession().",
    );
  }
  globalThis.mockAuth.mockResolvedValue(session);
}

export function mockHasPermission(granted: boolean) {
  globalThis.mockHasPermissionFor.mockReturnValue(granted);
}

export const prismaMock = globalThis.mockPrisma;
