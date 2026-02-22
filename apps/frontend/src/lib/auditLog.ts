import { type AuditAction, Prisma, type PrivilegeLevel } from "@prisma/client";
import prisma from "./prisma";

export const SYSTEM_USER_ID = "system";
type AuditLogClient = {
  auditLog: {
    create: (args: Prisma.AuditLogCreateArgs) => Promise<unknown>;
  };
};

export async function logAuditEvent(
  userId: string,
  userRole: PrivilegeLevel,
  action: AuditAction,
  entityType: string,
  entityId: string,
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null,
  metadata?: Record<string, unknown> | Prisma.InputJsonValue,
  client: AuditLogClient = prisma,
): Promise<void> {
  try {
    const beforeValue =
      before === null
        ? Prisma.JsonNull
        : (before as unknown as Prisma.InputJsonValue);
    const afterValue =
      after === null
        ? Prisma.JsonNull
        : (after as unknown as Prisma.InputJsonValue);
    const metadataValue = metadata as Prisma.InputJsonValue | undefined;
    await client.auditLog.create({
      data: {
        userId,
        userRole,
        action,
        entityType,
        entityId,
        beforeValue,
        afterValue,
        metadata: metadataValue,
      },
    });
  } catch (error) {
    console.error(
      `Failed to log audit event: action=${action}, entityType=${entityType}, entityId=${entityId}`,
      error,
    );
    // TODO: add `throwOnError` parameter and rethrow here when true for compliance-critical paths
  }
}
