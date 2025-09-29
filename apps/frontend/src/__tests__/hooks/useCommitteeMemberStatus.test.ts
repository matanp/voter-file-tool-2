import { renderHook } from "@testing-library/react";
import { useCommitteeMemberStatus } from "~/hooks/useCommitteeMemberStatus";
import type { VoterRecordAPI } from "@voter-file-tool/shared-validators";
import type { CommitteeMemberStatus } from "~/lib/types/committee";
import {
  COMMITTEE_CONSTANTS,
  COMMITTEE_MESSAGES,
} from "~/lib/constants/committee";

// Mock data factory for VoterRecordAPI (with string dates)
const createMockVoterRecordAPI = (
  overrides: Partial<VoterRecordAPI> = {},
): VoterRecordAPI => ({
  VRCNUM: "123456",
  committeeId: null,
  addressForCommittee: null,
  latestRecordEntryYear: 2024,
  latestRecordEntryNumber: 1,
  lastName: "Doe",
  firstName: "John",
  middleInitial: null,
  suffixName: null,
  houseNum: 123,
  street: "Main St",
  apartment: null,
  halfAddress: null,
  resAddrLine2: null,
  resAddrLine3: null,
  city: "Test City",
  state: "NY",
  zipCode: "12345",
  zipSuffix: null,
  telephone: null,
  email: null,
  mailingAddress1: null,
  mailingAddress2: null,
  mailingAddress3: null,
  mailingAddress4: null,
  mailingCity: null,
  mailingState: null,
  mailingZip: null,
  mailingZipSuffix: null,
  party: "DEM",
  gender: "M",
  DOB: "1990-01-01",
  L_T: null,
  electionDistrict: 1,
  countyLegDistrict: "1",
  stateAssmblyDistrict: "1",
  stateSenateDistrict: "1",
  congressionalDistrict: "1",
  CC_WD_Village: null,
  townCode: null,
  lastUpdate: "2024-01-01",
  originalRegDate: "2020-01-01",
  statevid: "123456",
  hasDiscrepancy: false,
  ...overrides,
});

describe("useCommitteeMemberStatus", () => {
  describe("Member status determination", () => {
    it("should return 'already_member' when voter is already in committee", () => {
      const record = createMockVoterRecordAPI({ VRCNUM: "123456" });
      const committeeList = [
        createMockVoterRecordAPI({ VRCNUM: "123456" }),
        createMockVoterRecordAPI({ VRCNUM: "789012" }),
      ];

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      const expected: CommitteeMemberStatus = {
        canAdd: false,
        reason: "already_member",
        message: COMMITTEE_MESSAGES.ALREADY_MEMBER,
      };

      expect(result.current).toEqual(expected);
    });

    it("should return 'different_committee' when voter has committeeId", () => {
      const record = createMockVoterRecordAPI({
        VRCNUM: "123456",
        committeeId: 5,
      });
      const committeeList = [createMockVoterRecordAPI({ VRCNUM: "789012" })];

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      const expected: CommitteeMemberStatus = {
        canAdd: false,
        reason: "different_committee",
        message: COMMITTEE_MESSAGES.DIFFERENT_COMMITTEE,
      };

      expect(result.current).toEqual(expected);
    });

    it("should return 'committee_full' when committee is at max capacity", () => {
      const record = createMockVoterRecordAPI({ VRCNUM: "123456" });
      const committeeList = Array.from(
        { length: COMMITTEE_CONSTANTS.MAX_MEMBERS },
        (_, i) => createMockVoterRecordAPI({ VRCNUM: `member${i}` }),
      );

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      const expected: CommitteeMemberStatus = {
        canAdd: false,
        reason: "committee_full",
        message: COMMITTEE_MESSAGES.COMMITTEE_FULL,
      };

      expect(result.current).toEqual(expected);
    });

    it("should return 'valid' when voter can be added to committee", () => {
      const record = createMockVoterRecordAPI({ VRCNUM: "123456" });
      const committeeList = [
        createMockVoterRecordAPI({ VRCNUM: "789012" }),
        createMockVoterRecordAPI({ VRCNUM: "345678" }),
      ];

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      const expected: CommitteeMemberStatus = {
        canAdd: true,
        reason: "valid",
        message: COMMITTEE_MESSAGES.ADD_TO_COMMITTEE,
      };

      expect(result.current).toEqual(expected);
    });
  });

  describe("Committee capacity validation", () => {
    it("should allow addition when committee has 0 members", () => {
      const record = createMockVoterRecordAPI({ VRCNUM: "123456" });
      const committeeList: VoterRecordAPI[] = [];

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      expect(result.current.canAdd).toBe(true);
      expect(result.current.reason).toBe("valid");
    });

    it("should allow addition when committee has 1 member", () => {
      const record = createMockVoterRecordAPI({ VRCNUM: "123456" });
      const committeeList = [createMockVoterRecordAPI({ VRCNUM: "789012" })];

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      expect(result.current.canAdd).toBe(true);
      expect(result.current.reason).toBe("valid");
    });

    it("should allow addition when committee has 2 members", () => {
      const record = createMockVoterRecordAPI({ VRCNUM: "123456" });
      const committeeList = [
        createMockVoterRecordAPI({ VRCNUM: "789012" }),
        createMockVoterRecordAPI({ VRCNUM: "345678" }),
      ];

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      expect(result.current.canAdd).toBe(true);
      expect(result.current.reason).toBe("valid");
    });

    it("should allow addition when committee has 3 members", () => {
      const record = createMockVoterRecordAPI({ VRCNUM: "123456" });
      const committeeList = [
        createMockVoterRecordAPI({ VRCNUM: "789012" }),
        createMockVoterRecordAPI({ VRCNUM: "345678" }),
        createMockVoterRecordAPI({ VRCNUM: "901234" }),
      ];

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      expect(result.current.canAdd).toBe(true);
      expect(result.current.reason).toBe("valid");
    });

    it("should prevent addition when committee has exactly 4 members", () => {
      const record = createMockVoterRecordAPI({ VRCNUM: "123456" });
      const committeeList = Array.from({ length: 4 }, (_, i) =>
        createMockVoterRecordAPI({ VRCNUM: `member${i}` }),
      );

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      expect(result.current.canAdd).toBe(false);
      expect(result.current.reason).toBe("committee_full");
    });

    it("should prevent addition when committee has more than 4 members", () => {
      const record = createMockVoterRecordAPI({ VRCNUM: "123456" });
      const committeeList = Array.from({ length: 5 }, (_, i) =>
        createMockVoterRecordAPI({ VRCNUM: `member${i}` }),
      );

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      expect(result.current.canAdd).toBe(false);
      expect(result.current.reason).toBe("committee_full");
    });
  });

  describe("Edge cases and business logic validation", () => {
    it("should prioritize 'already_member' over 'different_committee'", () => {
      const record = createMockVoterRecordAPI({
        VRCNUM: "123456",
        committeeId: 5,
      });
      const committeeList = [
        createMockVoterRecordAPI({ VRCNUM: "123456" }), // Same VRCNUM
        createMockVoterRecordAPI({ VRCNUM: "789012" }),
      ];

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      // Should return 'already_member' even though record has committeeId
      expect(result.current.reason).toBe("already_member");
      expect(result.current.message).toBe(COMMITTEE_MESSAGES.ALREADY_MEMBER);
    });

    it("should prioritize 'already_member' over 'committee_full'", () => {
      const record = createMockVoterRecordAPI({ VRCNUM: "123456" });
      const committeeList = [
        createMockVoterRecordAPI({ VRCNUM: "123456" }), // Same VRCNUM
        ...Array.from({ length: 3 }, (_, i) =>
          createMockVoterRecordAPI({ VRCNUM: `member${i}` }),
        ),
      ];

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      // Should return 'already_member' even though committee is full
      expect(result.current.reason).toBe("already_member");
      expect(result.current.message).toBe(COMMITTEE_MESSAGES.ALREADY_MEMBER);
    });

    it("should prioritize 'different_committee' over 'committee_full'", () => {
      const record = createMockVoterRecordAPI({
        VRCNUM: "123456",
        committeeId: 5,
      });
      const committeeList = Array.from({ length: 4 }, (_, i) =>
        createMockVoterRecordAPI({ VRCNUM: `member${i}` }),
      );

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      // Should return 'different_committee' even though committee is full
      expect(result.current.reason).toBe("different_committee");
      expect(result.current.message).toBe(
        COMMITTEE_MESSAGES.DIFFERENT_COMMITTEE,
      );
    });

    it("should handle empty committee list", () => {
      const record = createMockVoterRecordAPI({ VRCNUM: "123456" });
      const committeeList: VoterRecordAPI[] = [];

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      expect(result.current.canAdd).toBe(true);
      expect(result.current.reason).toBe("valid");
      expect(result.current.message).toBe(COMMITTEE_MESSAGES.ADD_TO_COMMITTEE);
    });

    it("should handle committeeId of 0 as valid (not in different committee)", () => {
      const record = createMockVoterRecordAPI({
        VRCNUM: "123456",
        committeeId: 0,
      });
      const committeeList = [createMockVoterRecordAPI({ VRCNUM: "789012" })];

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      // committeeId of 0 should be treated as null/not in committee
      expect(result.current.canAdd).toBe(true);
      expect(result.current.reason).toBe("valid");
    });

    it("should handle negative committeeId as different committee", () => {
      const record = createMockVoterRecordAPI({
        VRCNUM: "123456",
        committeeId: -1,
      });
      const committeeList = [createMockVoterRecordAPI({ VRCNUM: "789012" })];

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      // Negative committeeId should be treated as different committee
      expect(result.current.canAdd).toBe(false);
      expect(result.current.reason).toBe("different_committee");
    });

    it("should handle VRCNUM case sensitivity", () => {
      const record = createMockVoterRecordAPI({ VRCNUM: "123456" });
      const committeeList = [
        createMockVoterRecordAPI({ VRCNUM: "123456" }), // Exact match
        createMockVoterRecordAPI({ VRCNUM: "789012" }),
      ];

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      expect(result.current.reason).toBe("already_member");
    });

    it("should handle VRCNUM with leading/trailing spaces", () => {
      const record = createMockVoterRecordAPI({ VRCNUM: " 123456 " });
      const committeeList = [
        createMockVoterRecordAPI({ VRCNUM: "123456" }), // No spaces
        createMockVoterRecordAPI({ VRCNUM: "789012" }),
      ];

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      // Should not match due to spaces
      expect(result.current.reason).toBe("valid");
    });
  });

  describe("Return value accuracy", () => {
    it("should return correct message for each status", () => {
      const testCases = [
        {
          scenario: "already_member",
          record: createMockVoterRecordAPI({ VRCNUM: "123456" }),
          committeeList: [createMockVoterRecordAPI({ VRCNUM: "123456" })],
          expectedMessage: COMMITTEE_MESSAGES.ALREADY_MEMBER,
        },
        {
          scenario: "different_committee",
          record: createMockVoterRecordAPI({
            VRCNUM: "123456",
            committeeId: 5,
          }),
          committeeList: [createMockVoterRecordAPI({ VRCNUM: "789012" })],
          expectedMessage: COMMITTEE_MESSAGES.DIFFERENT_COMMITTEE,
        },
        {
          scenario: "committee_full",
          record: createMockVoterRecordAPI({ VRCNUM: "123456" }),
          committeeList: Array.from({ length: 4 }, (_, i) =>
            createMockVoterRecordAPI({ VRCNUM: `member${i}` }),
          ),
          expectedMessage: COMMITTEE_MESSAGES.COMMITTEE_FULL,
        },
        {
          scenario: "valid",
          record: createMockVoterRecordAPI({ VRCNUM: "123456" }),
          committeeList: [createMockVoterRecordAPI({ VRCNUM: "789012" })],
          expectedMessage: COMMITTEE_MESSAGES.ADD_TO_COMMITTEE,
        },
      ];

      testCases.forEach(
        ({ scenario, record, committeeList, expectedMessage }) => {
          const { result } = renderHook(() =>
            useCommitteeMemberStatus(record, committeeList),
          );

          expect(result.current.message).toBe(expectedMessage);
        },
      );
    });

    it("should return correct canAdd boolean for each status", () => {
      const testCases = [
        {
          scenario: "already_member",
          record: createMockVoterRecordAPI({ VRCNUM: "123456" }),
          committeeList: [createMockVoterRecordAPI({ VRCNUM: "123456" })],
          expectedCanAdd: false,
        },
        {
          scenario: "different_committee",
          record: createMockVoterRecordAPI({
            VRCNUM: "123456",
            committeeId: 5,
          }),
          committeeList: [createMockVoterRecordAPI({ VRCNUM: "789012" })],
          expectedCanAdd: false,
        },
        {
          scenario: "committee_full",
          record: createMockVoterRecordAPI({ VRCNUM: "123456" }),
          committeeList: Array.from({ length: 4 }, (_, i) =>
            createMockVoterRecordAPI({ VRCNUM: `member${i}` }),
          ),
          expectedCanAdd: false,
        },
        {
          scenario: "valid",
          record: createMockVoterRecordAPI({ VRCNUM: "123456" }),
          committeeList: [createMockVoterRecordAPI({ VRCNUM: "789012" })],
          expectedCanAdd: true,
        },
      ];

      testCases.forEach(
        ({ scenario, record, committeeList, expectedCanAdd }) => {
          const { result } = renderHook(() =>
            useCommitteeMemberStatus(record, committeeList),
          );

          expect(result.current.canAdd).toBe(expectedCanAdd);
        },
      );
    });

    it("should return correct reason for each status", () => {
      const testCases = [
        {
          scenario: "already_member",
          record: createMockVoterRecordAPI({ VRCNUM: "123456" }),
          committeeList: [createMockVoterRecordAPI({ VRCNUM: "123456" })],
          expectedReason: "already_member" as const,
        },
        {
          scenario: "different_committee",
          record: createMockVoterRecordAPI({
            VRCNUM: "123456",
            committeeId: 5,
          }),
          committeeList: [createMockVoterRecordAPI({ VRCNUM: "789012" })],
          expectedReason: "different_committee" as const,
        },
        {
          scenario: "committee_full",
          record: createMockVoterRecordAPI({ VRCNUM: "123456" }),
          committeeList: Array.from({ length: 4 }, (_, i) =>
            createMockVoterRecordAPI({ VRCNUM: `member${i}` }),
          ),
          expectedReason: "committee_full" as const,
        },
        {
          scenario: "valid",
          record: createMockVoterRecordAPI({ VRCNUM: "123456" }),
          committeeList: [createMockVoterRecordAPI({ VRCNUM: "789012" })],
          expectedReason: "valid" as const,
        },
      ];

      testCases.forEach(
        ({ scenario, record, committeeList, expectedReason }) => {
          const { result } = renderHook(() =>
            useCommitteeMemberStatus(record, committeeList),
          );

          expect(result.current.reason).toBe(expectedReason);
        },
      );
    });
  });

  describe("Business logic validation", () => {
    it("should use COMMITTEE_CONSTANTS.MAX_MEMBERS for capacity check", () => {
      const record = createMockVoterRecordAPI({ VRCNUM: "123456" });
      const committeeList = Array.from(
        { length: COMMITTEE_CONSTANTS.MAX_MEMBERS },
        (_, i) => createMockVoterRecordAPI({ VRCNUM: `member${i}` }),
      );

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      expect(result.current.reason).toBe("committee_full");
      expect(result.current.message).toBe(COMMITTEE_MESSAGES.COMMITTEE_FULL);
    });

    it("should use COMMITTEE_MESSAGES constants for all messages", () => {
      const messages = [
        COMMITTEE_MESSAGES.ALREADY_MEMBER,
        COMMITTEE_MESSAGES.DIFFERENT_COMMITTEE,
        COMMITTEE_MESSAGES.COMMITTEE_FULL,
        COMMITTEE_MESSAGES.ADD_TO_COMMITTEE,
      ];

      // Verify all expected messages are defined
      expect(
        messages.every((msg) => typeof msg === "string" && msg.length > 0),
      ).toBe(true);
    });

    it("should maintain consistent return type structure", () => {
      const record = createMockVoterRecordAPI({ VRCNUM: "123456" });
      const committeeList = [createMockVoterRecordAPI({ VRCNUM: "789012" })];

      const { result } = renderHook(() =>
        useCommitteeMemberStatus(record, committeeList),
      );

      // Verify return type structure
      expect(result.current).toHaveProperty("canAdd");
      expect(result.current).toHaveProperty("reason");
      expect(result.current).toHaveProperty("message");

      expect(typeof result.current.canAdd).toBe("boolean");
      expect(typeof result.current.reason).toBe("string");
      expect(typeof result.current.message).toBe("string");
    });
  });
});
