import { type AuditAction, type Prisma, type PrivilegeLevel } from "@prisma/client";
import type { JsonValue } from "@prisma/client/runtime/library";
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
  metadata?: Record<string, unknown>,
  client: AuditLogClient = prisma,
): Promise<void> {
  try {
    await client.auditLog.create({
      data: {
        userId,
        userRole,
        action,
        entityType,
        entityId,
        beforeValue: before as unknown as JsonValue | undefined,
        afterValue: after as unknown as JsonValue | undefined,
        metadata: metadata as unknown as JsonValue | undefined,
      },
    });
  } catch (error) {
    console.error(
      `Failed to log audit event: action=${action}, entityType=${entityType}, entityId=${entityId}`,
      error,
    );
  }
}
