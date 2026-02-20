import { AuditAction, Prisma, PrivilegeLevel } from "@prisma/client";
import { logAuditEvent, SYSTEM_USER_ID } from "~/lib/auditLog";
import { prismaMock } from "../utils/mocks";
import {
  expectAuditLogCreate,
  createMockSession,
} from "../utils/testUtils";

describe("auditLog", () => {
  describe("SYSTEM_USER_ID", () => {
    it("equals 'system'", () => {
      expect(SYSTEM_USER_ID).toBe("system");
    });
  });

  describe("logAuditEvent", () => {
    it("creates an AuditLog record with correct fields", async () => {
      const session = createMockSession();
      const user = session.user!;
      const userId = user.id ?? "test-user-id";
      prismaMock.auditLog.create.mockResolvedValue({} as never);

      await logAuditEvent(
        userId,
        user.privilegeLevel ?? PrivilegeLevel.Admin,
        AuditAction.MEMBER_ACTIVATED,
        "CommitteeMembership",
        "membership-123",
        null,
        { status: "ACTIVE" },
      );

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          userId,
          userRole: user.privilegeLevel ?? PrivilegeLevel.Admin,
          action: AuditAction.MEMBER_ACTIVATED,
          entityType: "CommitteeMembership",
          entityId: "membership-123",
          beforeValue: Prisma.JsonNull,
          afterValue: { status: "ACTIVE" },
        }),
      );
    });

    it("handles before=null and after populated (new entity creation)", async () => {
      prismaMock.auditLog.create.mockResolvedValue({} as never);

      await logAuditEvent(
        "user-1",
        PrivilegeLevel.Admin,
        AuditAction.MEMBER_SUBMITTED,
        "CommitteeMembership",
        "membership-456",
        null,
        { status: "SUBMITTED" },
      );

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          beforeValue: Prisma.JsonNull,
          afterValue: { status: "SUBMITTED" },
        }),
      );
    });

    it("handles both before and after populated (status transition)", async () => {
      prismaMock.auditLog.create.mockResolvedValue({} as never);

      await logAuditEvent(
        "user-2",
        PrivilegeLevel.Admin,
        AuditAction.MEMBER_ACTIVATED,
        "CommitteeMembership",
        "membership-789",
        { status: "CONFIRMED" },
        { status: "ACTIVE", activatedAt: "2024-01-15" },
      );

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          beforeValue: { status: "CONFIRMED" },
          afterValue: { status: "ACTIVE", activatedAt: "2024-01-15" },
        }),
      );
    });

    it("does not throw when prisma.auditLog.create rejects — logs to console.error", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      prismaMock.auditLog.create.mockRejectedValue(new Error("DB connection lost"));

      await expect(
        logAuditEvent(
          "user-3",
          PrivilegeLevel.Admin,
          AuditAction.MEMBER_REMOVED,
          "CommitteeMembership",
          "membership-999",
          { status: "ACTIVE" },
          { status: "REMOVED" },
        ),
      ).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to log audit event: action=MEMBER_REMOVED, entityType=CommitteeMembership, entityId=membership-999",
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });

    it("passes metadata when provided", async () => {
      prismaMock.auditLog.create.mockResolvedValue({} as never);

      await logAuditEvent(
        "user-4",
        PrivilegeLevel.Admin,
        AuditAction.DISCREPANCY_RESOLVED,
        "CommitteeUploadDiscrepancy",
        "disc-1",
        { discrepancy: "old" },
        { discrepancy: "resolved" },
        { reason: "Manual override", ip: "127.0.0.1" },
      );

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          metadata: { reason: "Manual override", ip: "127.0.0.1" },
        }),
      );
    });
  });
});
