import { PrivilegeLevel } from "@prisma/client";
import { loadScopedReportPageData } from "~/lib/loadScopedReportPageData";
import { hasPermissionFor as realHasPermissionFor } from "~/lib/utils";
import {
  createMockSession,
  DEFAULT_ACTIVE_TERM_ID,
} from "../utils/testUtils";
import { mockAuthSession, prismaMock } from "../utils/mocks";

type UserJurisdictionMock = { findMany: jest.Mock };

function getUserJurisdictionMock(): UserJurisdictionMock {
  return (prismaMock as unknown as { userJurisdiction: UserJurisdictionMock })
    .userJurisdiction;
}

describe("loadScopedReportPageData", () => {
  beforeEach(() => {
    jest.mocked(realHasPermissionFor).mockImplementation(
      jest.requireActual<{ hasPermissionFor: typeof realHasPermissionFor }>(
        "~/lib/utils",
      ).hasPermissionFor,
    );
  });

  it("denies access below Leader", async () => {
    mockAuthSession(
      createMockSession({
        user: { id: "user-1", privilegeLevel: PrivilegeLevel.ReadAccess },
      }),
    );

    const result = await loadScopedReportPageData();

    expect(result.isLeaderOrAbove).toBe(false);
    expect(result.committeeLists).toEqual([]);
    expect(prismaMock.committeeList.findMany).not.toHaveBeenCalled();
  });

  it("returns empty committees for Leader with no jurisdictions", async () => {
    mockAuthSession(
      createMockSession({
        user: { id: "leader-1", privilegeLevel: PrivilegeLevel.Leader },
      }),
    );
    getUserJurisdictionMock().findMany.mockResolvedValue([]);

    const result = await loadScopedReportPageData();

    expect(result.isLeaderOrAbove).toBe(true);
    expect(result.committeeLists).toEqual([]);
    expect(prismaMock.committeeList.findMany).not.toHaveBeenCalled();
  });

  it("returns empty committees for Leader with missing user id", async () => {
    mockAuthSession(
      createMockSession({
        user: { id: undefined, privilegeLevel: PrivilegeLevel.Leader },
      }),
    );

    const result = await loadScopedReportPageData();

    expect(result.committeeLists).toEqual([]);
    expect(prismaMock.committeeList.findMany).not.toHaveBeenCalled();
  });

  it("loads jurisdiction-filtered committees for Leader", async () => {
    mockAuthSession(
      createMockSession({
        user: { id: "leader-1", privilegeLevel: PrivilegeLevel.Leader },
      }),
    );
    getUserJurisdictionMock().findMany.mockResolvedValue([
      {
        id: "j1",
        userId: "leader-1",
        cityTown: "ROCHESTER",
        legDistrict: 1,
        termId: DEFAULT_ACTIVE_TERM_ID,
        createdAt: new Date(),
        createdById: "admin-1",
      },
    ]);
    prismaMock.committeeList.findMany.mockResolvedValue([
      {
        id: 1,
        cityTown: "ROCHESTER",
        legDistrict: 1,
        electionDistrict: 1,
        termId: DEFAULT_ACTIVE_TERM_ID,
        ltedWeight: null,
      },
    ]);

    const result = await loadScopedReportPageData();

    expect(result.committeeLists).toHaveLength(1);
    expect(prismaMock.committeeList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          termId: DEFAULT_ACTIVE_TERM_ID,
        }),
      }),
    );
  });

  it("loads all active-term committees for Admin", async () => {
    mockAuthSession(
      createMockSession({
        user: { id: "admin-1", privilegeLevel: PrivilegeLevel.Admin },
      }),
    );
    prismaMock.committeeList.findMany.mockResolvedValue([
      {
        id: 1,
        cityTown: "ROCHESTER",
        legDistrict: 1,
        electionDistrict: 1,
        termId: DEFAULT_ACTIVE_TERM_ID,
        ltedWeight: null,
      },
      {
        id: 2,
        cityTown: "GREECE",
        legDistrict: 1,
        electionDistrict: 1,
        termId: DEFAULT_ACTIVE_TERM_ID,
        ltedWeight: null,
      },
    ]);

    const result = await loadScopedReportPageData();

    expect(result.committeeLists).toHaveLength(2);
    expect(getUserJurisdictionMock().findMany).not.toHaveBeenCalled();
  });
});
