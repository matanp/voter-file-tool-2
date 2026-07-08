import { PrivilegeLevel } from "@prisma/client";
import {
  getAdminPageAccess,
  getAuthenticatedPageAccess,
} from "~/lib/getAdminPageAccess";
import { hasPermissionFor as realHasPermissionFor } from "~/lib/utils";
import { createMockSession } from "../utils/testUtils";
import { mockAuthSession } from "../utils/mocks";

describe("getAuthenticatedPageAccess", () => {
  beforeEach(() => {
    jest.mocked(realHasPermissionFor).mockImplementation(
      jest.requireActual<{ hasPermissionFor: typeof realHasPermissionFor }>(
        "~/lib/utils",
      ).hasPermissionFor,
    );
  });

  it("denies unauthenticated sessions", async () => {
    mockAuthSession(null);

    const result = await getAuthenticatedPageAccess();

    expect(result).toEqual({ ok: false });
  });

  it("denies sessions without a user id", async () => {
    mockAuthSession(
      createMockSession({
        user: { id: undefined, privilegeLevel: PrivilegeLevel.ReadAccess },
      }),
    );

    const result = await getAuthenticatedPageAccess();

    expect(result).toEqual({ ok: false });
  });

  it.each([
    PrivilegeLevel.ReadAccess,
    PrivilegeLevel.Leader,
    PrivilegeLevel.Admin,
    PrivilegeLevel.Developer,
  ])("allows authenticated %s sessions", async (privilegeLevel) => {
    mockAuthSession(
      createMockSession({
        user: { id: "user-1", privilegeLevel },
      }),
    );

    const result = await getAuthenticatedPageAccess();

    expect(result).toEqual({
      ok: true,
      userId: "user-1",
      privilegeLevel,
    });
  });

  it("defaults missing privilege to ReadAccess", async () => {
    const session = createMockSession();
    session.user.id = "user-1";
    delete (session.user as { privilegeLevel?: PrivilegeLevel }).privilegeLevel;
    mockAuthSession(session);

    const result = await getAuthenticatedPageAccess();

    expect(result).toEqual({
      ok: true,
      userId: "user-1",
      privilegeLevel: PrivilegeLevel.ReadAccess,
    });
  });
});

describe("getAdminPageAccess", () => {
  beforeEach(() => {
    jest.mocked(realHasPermissionFor).mockImplementation(
      jest.requireActual<{ hasPermissionFor: typeof realHasPermissionFor }>(
        "~/lib/utils",
      ).hasPermissionFor,
    );
  });

  it("denies unauthenticated sessions", async () => {
    mockAuthSession(null);

    const result = await getAdminPageAccess();

    expect(result).toEqual({ ok: false });
  });

  it.each([PrivilegeLevel.ReadAccess, PrivilegeLevel.Leader])(
    "denies %s sessions",
    async (privilegeLevel) => {
      mockAuthSession(
        createMockSession({
          user: { id: "user-1", privilegeLevel },
        }),
      );

      const result = await getAdminPageAccess();

      expect(result).toEqual({ ok: false });
    },
  );

  it.each([PrivilegeLevel.Admin, PrivilegeLevel.Developer])(
    "allows %s sessions",
    async (privilegeLevel) => {
      mockAuthSession(
        createMockSession({
          user: { id: "admin-1", privilegeLevel },
        }),
      );

      const result = await getAdminPageAccess();

      expect(result).toEqual({
        ok: true,
        userId: "admin-1",
        privilegeLevel,
      });
    },
  );
});
