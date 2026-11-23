import { PrivilegeLevel } from "@prisma/client";
import { getAdminNavCounts } from "~/app/admin/adminNavCounts";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import { pendingItemsWhere } from "~/app/api/lib/pendingExitReports";
import { hasPrivilegeFor } from "~/lib/utils";
import { mockAuthSession, prismaMock } from "../../../utils/mocks";
import { createMockSession } from "../../../utils/testUtils";

jest.mock("~/app/api/lib/committeeValidation", () => ({
  ...jest.requireActual<object>("~/app/api/lib/committeeValidation"),
  getActiveTermId: jest.fn(),
}));

const mockActiveTermId = jest.mocked(getActiveTermId);

function signInAs(privilegeLevel: PrivilegeLevel) {
  mockAuthSession(
    createMockSession({ user: { id: "user-1", privilegeLevel } }),
  );
}

describe("getAdminNavCounts", () => {
  beforeEach(() => {
    // Real privilege check, so these tests exercise getAdminPageAccess too.
    jest
      .mocked(hasPrivilegeFor)
      .mockImplementation(
        jest.requireActual<{ hasPrivilegeFor: typeof hasPrivilegeFor }>(
          "~/lib/utils",
        ).hasPrivilegeFor,
      );
    mockActiveTermId.mockReset();
    mockActiveTermId.mockResolvedValue("term-1");
  });

  it("counts pending Submissions and Exit Reports in the active term", async () => {
    signInAs(PrivilegeLevel.Admin);
    prismaMock.committeeMembership.count.mockResolvedValue(3);

    await expect(getAdminNavCounts()).resolves.toEqual({ pendingReview: 3 });
    expect(prismaMock.committeeMembership.count).toHaveBeenCalledWith({
      where: pendingItemsWhere("term-1"),
    });
  });

  it("returns no counts and skips the query when signed out", async () => {
    mockAuthSession(null);

    await expect(getAdminNavCounts()).resolves.toEqual({});
    expect(prismaMock.committeeMembership.count).not.toHaveBeenCalled();
  });

  it("returns no counts and skips the query for a Leader", async () => {
    signInAs(PrivilegeLevel.Leader);

    await expect(getAdminNavCounts()).resolves.toEqual({});
    expect(prismaMock.committeeMembership.count).not.toHaveBeenCalled();
  });

  it("returns no counts when there is no active term", async () => {
    signInAs(PrivilegeLevel.Admin);
    mockActiveTermId.mockRejectedValue(new Error("No active term"));

    await expect(getAdminNavCounts()).resolves.toEqual({});
    expect(prismaMock.committeeMembership.count).not.toHaveBeenCalled();
  });
});
