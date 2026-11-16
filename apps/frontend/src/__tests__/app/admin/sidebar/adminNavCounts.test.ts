import { PrivilegeLevel } from "@prisma/client";
import { getAdminNavCounts } from "~/app/admin/adminNavCounts";
import { getAdminPageAccess } from "~/lib/getAdminPageAccess";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import { pendingItemsWhere } from "~/app/api/lib/pendingExitReports";
import { prismaMock } from "../../../utils/mocks";

jest.mock("~/lib/getAdminPageAccess", () => ({
  getAdminPageAccess: jest.fn(),
}));

jest.mock("~/app/api/lib/committeeValidation", () => ({
  ...jest.requireActual<object>("~/app/api/lib/committeeValidation"),
  getActiveTermId: jest.fn(),
}));

const mockAccess = jest.mocked(getAdminPageAccess);
const mockActiveTermId = jest.mocked(getActiveTermId);

describe("getAdminNavCounts", () => {
  it("counts pending submissions and Exit Reports in the active term", async () => {
    mockAccess.mockResolvedValue({
      ok: true,
      userId: "admin-1",
      privilegeLevel: PrivilegeLevel.Admin,
    });
    mockActiveTermId.mockResolvedValue("term-1");
    prismaMock.committeeMembership.count.mockResolvedValue(3);

    await expect(getAdminNavCounts()).resolves.toEqual({
      "pending-requests": 3,
    });
    expect(prismaMock.committeeMembership.count).toHaveBeenCalledWith({
      where: pendingItemsWhere("term-1"),
    });
  });

  it("returns no counts and skips the query for a non-Admin", async () => {
    mockAccess.mockResolvedValue({ ok: false });

    await expect(getAdminNavCounts()).resolves.toEqual({});
    expect(prismaMock.committeeMembership.count).not.toHaveBeenCalled();
  });

  it("returns no counts when there is no active term", async () => {
    mockAccess.mockResolvedValue({
      ok: true,
      userId: "admin-1",
      privilegeLevel: PrivilegeLevel.Admin,
    });
    mockActiveTermId.mockRejectedValue(new Error("No active term"));

    await expect(getAdminNavCounts()).resolves.toEqual({});
    expect(prismaMock.committeeMembership.count).not.toHaveBeenCalled();
  });
});
