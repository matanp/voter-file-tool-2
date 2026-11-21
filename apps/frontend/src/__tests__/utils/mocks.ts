import type { UserJurisdiction } from "@prisma/client";
import type { Session } from "next-auth";
import { hasPrivilegeFor } from "~/lib/utils";
import type * as UtilsModule from "~/lib/utils";
import { DEFAULT_ACTIVE_TERM_ID } from "./testUtils";

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
  if (!globalThis.mockHasPrivilegeFor) {
    if (!globalThis.jest?.fn) {
      throw new Error(
        "Jest is not available in global scope. Ensure test setup runs before using mockHasPermission().",
      );
    }
    globalThis.mockHasPrivilegeFor =
      globalThis.jest.fn() as jest.MockedFunction<
        (...args: unknown[]) => boolean
      >;
  }

  // Type guard to ensure we have a proper mock
  const mockHasPrivilegeFor = globalThis.mockHasPrivilegeFor as
    | jest.MockedFunction<(...args: unknown[]) => boolean>
    | undefined;

  if (!mockHasPrivilegeFor) {
    throw new Error(
      "globalThis.mockHasPrivilegeFor must be a Jest mock. Ensure test setup runs before using mockHasPermission().",
    );
  }
  mockHasPrivilegeFor.mockReturnValue(granted);
}

/**
 * Restores the real privilege hierarchy behind the global `hasPrivilegeFor`
 * mock, for code that checks a role inside a route (not just `withPrivilege`),
 * so a ReadAccess session really is below Leader.
 */
export function mockRealPermissionHierarchy() {
  jest
    .mocked(hasPrivilegeFor)
    .mockImplementation(
      jest.requireActual<typeof UtilsModule>("~/lib/utils").hasPrivilegeFor,
    );
}

export const prismaMock = globalThis.mockPrisma;

/**
 * A Leader's assignment row (`UserJurisdiction`) in the default active term,
 * as `userJurisdiction.findMany` returns it (no `select`). A null LD covers
 * the whole town.
 */
export function jurisdictionRow(
  cityTown: string,
  legDistrict: number | null,
): UserJurisdiction {
  return {
    id: `jurisdiction-${cityTown}-${String(legDistrict)}`,
    userId: "test-user-id",
    cityTown,
    legDistrict,
    termId: DEFAULT_ACTIVE_TERM_ID,
    createdAt: new Date("2026-01-01"),
    createdById: "admin-1",
  };
}

// --- Raw SQL ($queryRaw / $executeRaw) ------------------------------------------

/**
 * `prismaMock.$queryRaw` or `$executeRaw` as a plain Jest mock. Both are generic
 * tagged-template methods whose deep-mock type can't take a resolved value or
 * expose call values, so this is the one place that cast lives
 * (skills/test-type-safety).
 */
export function rawQueryMock(method: "$queryRaw" | "$executeRaw"): jest.Mock {
  return prismaMock[method] as unknown as jest.Mock;
}

/**
 * The bound values of a raw tagged-template call, with the template strings
 * dropped. Throws if the mock was not called that many times.
 */
export function rawQueryValues(mock: jest.Mock, callIndex = 0): unknown[] {
  const call = mock.mock.calls[callIndex] as unknown[] | undefined;
  if (!call) {
    throw new Error(
      `Expected raw query to have been called at least ${String(callIndex + 1)} time(s), but was called ${String(mock.mock.calls.length)} time(s)`,
    );
  }
  return call.slice(1);
}

/**
 * The bound values of a raw tagged-template call keyed by `names`, which list
 * the SQL's interpolations in order. A count mismatch throws, so adding or
 * dropping a parameter fails loudly instead of shifting every position.
 */
export function namedRawQueryValues<Names extends readonly string[]>(
  mock: jest.Mock,
  names: Names,
  callIndex = 0,
): Record<Names[number], unknown> {
  const values = rawQueryValues(mock, callIndex);
  if (values.length !== names.length) {
    throw new Error(
      `Expected ${String(names.length)} raw query values (${names.join(", ")}), got ${String(values.length)}`,
    );
  }
  return Object.fromEntries(
    names.map((name, i) => [name, values[i]]),
  ) as Record<Names[number], unknown>;
}

// --- Client-side fetch (component tests) ----------------------------------------

/** The part of `Response` client code reads: status, ok, headers, and JSON. */
export type FetchJsonResponse = Pick<Response, "ok" | "status" | "statusText" | "json"> & {
  headers: { get: (name: string) => string | null };
};

/** A JSON `Response` stand-in for a mocked `fetch`. */
export function fetchJsonResponse(body: unknown, status = 200): FetchJsonResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    headers: { get: () => "application/json" },
    json: () => Promise.resolve(body),
  };
}

export type FetchMockImpl = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<FetchJsonResponse>;

/**
 * Installs `impl` as `global.fetch` and returns the Jest mock, keeping the one
 * unavoidable cast at this boundary (skills/test-type-safety).
 */
export function installFetchMock(
  impl: FetchMockImpl,
): jest.Mock<ReturnType<FetchMockImpl>, Parameters<FetchMockImpl>> {
  const fetchMock = jest.fn(impl);
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
