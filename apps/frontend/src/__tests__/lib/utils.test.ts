import { PrivilegeLevel } from "@prisma/client";

/**
 * Tests use the real hasPermissionFor implementation (not the global mock).
 */
const realHasPermissionFor = jest.requireActual<typeof import("~/lib/utils")>(
  "~/lib/utils",
).hasPermissionFor;

describe("hasPermissionFor", () => {
  // Use real implementation (bypass global mock)
  const check = realHasPermissionFor;

  describe("privilege hierarchy: Developer > Admin > Leader > RequestAccess > ReadAccess", () => {
    it("grants Admin to Developer", () => {
      expect(check(PrivilegeLevel.Developer, PrivilegeLevel.Admin)).toBe(true);
    });

    it("grants Leader to Developer and Admin", () => {
      expect(check(PrivilegeLevel.Developer, PrivilegeLevel.Leader)).toBe(true);
      expect(check(PrivilegeLevel.Admin, PrivilegeLevel.Leader)).toBe(true);
    });

    it("denies Admin to Leader (prevents privilege escalation)", () => {
      expect(check(PrivilegeLevel.Leader, PrivilegeLevel.Admin)).toBe(false);
    });

    it("grants RequestAccess to Leader", () => {
      expect(check(PrivilegeLevel.Leader, PrivilegeLevel.RequestAccess)).toBe(
        true,
      );
    });

    it("denies Leader to RequestAccess and ReadAccess users", () => {
      expect(check(PrivilegeLevel.RequestAccess, PrivilegeLevel.Leader)).toBe(
        false,
      );
      expect(check(PrivilegeLevel.ReadAccess, PrivilegeLevel.Leader)).toBe(
        false,
      );
    });

    it("grants ReadAccess to Leader and above", () => {
      expect(check(PrivilegeLevel.Leader, PrivilegeLevel.ReadAccess)).toBe(
        true,
      );
      expect(check(PrivilegeLevel.RequestAccess, PrivilegeLevel.ReadAccess)).toBe(
        true,
      );
      expect(check(PrivilegeLevel.ReadAccess, PrivilegeLevel.ReadAccess)).toBe(
        true,
      );
    });
  });

  describe("unknown roles have no privileges (fail-safe)", () => {
    it("denies when user role is not in PRIVILEGE_ORDER", () => {
      // Simulate a future enum value not yet in PRIVILEGE_ORDER.
      // TypeScript allows this at runtime if someone casts or DB returns it.
      const unknownRole = "FutureRole" as PrivilegeLevel;
      expect(check(unknownRole, PrivilegeLevel.ReadAccess)).toBe(false);
      expect(check(unknownRole, PrivilegeLevel.Admin)).toBe(false);
    });

    it("denies when required level is not in PRIVILEGE_ORDER", () => {
      const unknownRequired = "FutureRequired" as PrivilegeLevel;
      expect(check(PrivilegeLevel.Developer, unknownRequired)).toBe(false);
      expect(check(PrivilegeLevel.Admin, unknownRequired)).toBe(false);
    });
  });
});
