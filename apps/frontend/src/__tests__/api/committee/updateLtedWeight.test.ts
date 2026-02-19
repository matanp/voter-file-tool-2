import { PATCH } from "~/app/api/committee/updateLtedWeight/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockRequest,
  createMockSession,
  createMockGovernanceConfig,
  expectSuccessResponse,
  expectErrorResponse,
  expectAnything,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

describe("/api/committee/updateLtedWeight", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPermission(true);
  });

  it("updates LTED weight and recomputes seat weights atomically", async () => {
    prismaMock.committeeList.findUnique
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ ltedWeight: 120 });
    prismaMock.committeeList.update.mockResolvedValue({ id: 1, ltedWeight: 120 });
    prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
      createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
    );
    prismaMock.seat.updateMany.mockResolvedValue({ count: 4 });

    const response = await PATCH(
      createMockRequest(
        { committeeListId: 1, ltedWeight: 120 },
        {},
        { method: "PATCH" },
      ),
    );

    await expectSuccessResponse(response, { success: true }, 200);
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(prismaMock.committeeList.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { ltedWeight: 120 },
    });
    expect(prismaMock.seat.updateMany).toHaveBeenCalledWith({
      where: { committeeListId: 1 },
      data: { weight: expectAnything() },
    });
  });

  it("returns 500 and rolls back LTED weight when recompute fails", async () => {
    let persistedWeight = 10;

    const tx = {
      committeeList: {
        findUnique: jest.fn().mockImplementation(({ select }: { select?: { id?: boolean } }) => {
          if (select?.id) {
            return Promise.resolve({ id: 1 });
          }
          return Promise.resolve({ ltedWeight: persistedWeight });
        }),
        update: jest.fn().mockImplementation(({ data }: { data: { ltedWeight: number | null } }) => {
          persistedWeight = data.ltedWeight ?? 0;
          return Promise.resolve({ id: 1, ltedWeight: data.ltedWeight });
        }),
      },
      committeeGovernanceConfig: {
        findFirst: jest.fn().mockResolvedValue(
          createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
        ),
      },
      seat: {
        updateMany: jest.fn().mockRejectedValue(new Error("recompute failed")),
      },
    };

    (prismaMock.$transaction as jest.Mock).mockImplementation(
      async (
        callback: (txClient: typeof tx) => Promise<unknown>,
      ): Promise<unknown> => {
        const originalWeight = persistedWeight;
        try {
          await callback(tx);
        } catch (error) {
          persistedWeight = originalWeight;
          throw error;
        }
        return undefined;
      },
    );

    const response = await PATCH(
      createMockRequest(
        { committeeListId: 1, ltedWeight: 999 },
        {},
        { method: "PATCH" },
      ),
    );

    await expectErrorResponse(response, 500, "Internal server error");
    expect(persistedWeight).toBe(10);
    expect(tx.committeeList.update).toHaveBeenCalled();
    expect(tx.seat.updateMany).toHaveBeenCalled();
  });

  it("returns 404 when committee does not exist", async () => {
    prismaMock.committeeList.findUnique.mockResolvedValue(null);

    const response = await PATCH(
      createMockRequest(
        { committeeListId: 999, ltedWeight: 120 },
        {},
        { method: "PATCH" },
      ),
    );

    await expectErrorResponse(response, 404, "Committee not found");
    expect(prismaMock.committeeList.update).not.toHaveBeenCalled();
  });
});
