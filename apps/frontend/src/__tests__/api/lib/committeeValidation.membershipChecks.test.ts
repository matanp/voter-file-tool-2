/**
 * SRS §7.1 — Tests for tx-aware committee membership capacity helpers.
 */

import {
  type CommitteeMembershipClient,
  countActiveMembers,
  isCommitteeAtCapacity,
  isVoterActiveInAnotherCommittee,
} from "~/app/api/lib/committeeValidation";
import { prismaMock } from "../../utils/mocks";
import { DEFAULT_ACTIVE_TERM_ID } from "../../utils/testUtils";

function getMembershipMock() {
  return prismaMock.committeeMembership as {
    count: jest.Mock;
    findFirst: jest.Mock;
  };
}

describe("committeeValidation — membership checks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("countActiveMembers", () => {
    it("counts ACTIVE memberships for committee+term", async () => {
      getMembershipMock().count.mockResolvedValue(3);

      const result = await countActiveMembers(42, DEFAULT_ACTIVE_TERM_ID);

      expect(result).toBe(3);
      expect(getMembershipMock().count).toHaveBeenCalledWith({
        where: {
          committeeListId: 42,
          termId: DEFAULT_ACTIVE_TERM_ID,
          status: "ACTIVE",
        },
      });
    });

    it("uses the passed client instead of the default prisma client", async () => {
      const txClient = {
        committeeMembership: {
          count: jest.fn().mockResolvedValue(2),
        },
      } as unknown as CommitteeMembershipClient;

      const result = await countActiveMembers(
        7,
        DEFAULT_ACTIVE_TERM_ID,
        txClient,
      );

      expect(result).toBe(2);
      expect(txClient.committeeMembership.count).toHaveBeenCalledWith({
        where: {
          committeeListId: 7,
          termId: DEFAULT_ACTIVE_TERM_ID,
          status: "ACTIVE",
        },
      });
      expect(getMembershipMock().count).not.toHaveBeenCalled();
    });
  });

  describe("isCommitteeAtCapacity", () => {
    it("returns true when active count meets maxSeatsPerLted", async () => {
      getMembershipMock().count.mockResolvedValue(4);

      const result = await isCommitteeAtCapacity(
        1,
        DEFAULT_ACTIVE_TERM_ID,
        4,
      );

      expect(result).toBe(true);
    });

    it("returns false when active count is below maxSeatsPerLted", async () => {
      getMembershipMock().count.mockResolvedValue(2);

      const result = await isCommitteeAtCapacity(
        1,
        DEFAULT_ACTIVE_TERM_ID,
        4,
      );

      expect(result).toBe(false);
    });
  });

  describe("isVoterActiveInAnotherCommittee", () => {
    it("returns true when an ACTIVE membership exists in another committee", async () => {
      getMembershipMock().findFirst.mockResolvedValue({ id: "m-1" });

      const result = await isVoterActiveInAnotherCommittee(
        "VRC-1",
        10,
        DEFAULT_ACTIVE_TERM_ID,
      );

      expect(result).toBe(true);
      expect(getMembershipMock().findFirst).toHaveBeenCalledWith({
        where: {
          voterRecordId: "VRC-1",
          termId: DEFAULT_ACTIVE_TERM_ID,
          status: "ACTIVE",
          NOT: { committeeListId: 10 },
        },
        select: { id: true },
      });
    });

    it("returns false when no ACTIVE membership exists elsewhere", async () => {
      getMembershipMock().findFirst.mockResolvedValue(null);

      const result = await isVoterActiveInAnotherCommittee(
        "VRC-1",
        10,
        DEFAULT_ACTIVE_TERM_ID,
      );

      expect(result).toBe(false);
    });

    it("uses the passed client instead of the default prisma client", async () => {
      const txClient = {
        committeeMembership: {
          findFirst: jest.fn().mockResolvedValue({ id: "m-2" }),
        },
      } as unknown as CommitteeMembershipClient;

      const result = await isVoterActiveInAnotherCommittee(
        "VRC-2",
        5,
        DEFAULT_ACTIVE_TERM_ID,
        txClient,
      );

      expect(result).toBe(true);
      expect(txClient.committeeMembership.findFirst).toHaveBeenCalledWith({
        where: {
          voterRecordId: "VRC-2",
          termId: DEFAULT_ACTIVE_TERM_ID,
          status: "ACTIVE",
          NOT: { committeeListId: 5 },
        },
        select: { id: true },
      });
      expect(getMembershipMock().findFirst).not.toHaveBeenCalled();
    });
  });
});
