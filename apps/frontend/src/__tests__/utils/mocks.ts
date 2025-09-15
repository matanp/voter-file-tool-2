import type { Session } from "next-auth";

// Convenience helpers to work with global mocks in a type-safe way

export function mockAuthSession(session: Session | null) {
  (
    globalThis.mockAuth as unknown as jest.MockedFunction<
      () => Promise<Session | null>
    >
  ).mockResolvedValue(session);
}

export function mockHasPermission(granted: boolean) {
  globalThis.mockHasPermissionFor.mockReturnValue(granted);
}

export const prismaMock = globalThis.mockPrisma;
