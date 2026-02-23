import { type AuditAction, Prisma, type PrivilegeLevel } from "@prisma/client";
import prisma from "./prisma";

export const SYSTEM_USER_ID = "system";
type AuditLogClient = {
  auditLog: {
    create: (args: Prisma.AuditLogCreateArgs) => Promise<unknown>;
  };
};

type AuditMetadata = Record<string, unknown> | Prisma.InputJsonValue;

type WriteAuditEventParams = {
  userId: string,
  userRole: PrivilegeLevel,
  action: AuditAction,
  entityType: string,
  entityId: string,
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null,
  metadata?: AuditMetadata,
  client?: AuditLogClient,
  throwOnError?: boolean,
};

async function writeAuditEvent({
  userId,
  userRole,
  action,
  entityType,
  entityId,
  before,
  after,
  metadata,
  client = prisma,
  throwOnError = false,
}: WriteAuditEventParams): Promise<void> {
  const beforeValue =
    before === null
      ? Prisma.JsonNull
      : (before as unknown as Prisma.InputJsonValue);
  const afterValue =
    after === null
      ? Prisma.JsonNull
      : (after as unknown as Prisma.InputJsonValue);
  const metadataValue = metadata as Prisma.InputJsonValue | undefined;

  try {
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
    if (throwOnError) {
      throw error;
    }
  }
}

export async function logAuditEvent(
  userId: string,
  userRole: PrivilegeLevel,
  action: AuditAction,
  entityType: string,
  entityId: string,
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null,
  metadata?: AuditMetadata,
  client: AuditLogClient = prisma,
): Promise<void> {
  await writeAuditEvent({
    userId,
    userRole,
    action,
    entityType,
    entityId,
    before,
    after,
    metadata,
    client,
    throwOnError: false,
  });
}

export async function logAuditEventOrThrow(
  userId: string,
  userRole: PrivilegeLevel,
  action: AuditAction,
  entityType: string,
  entityId: string,
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null,
  metadata?: AuditMetadata,
  client: AuditLogClient = prisma,
): Promise<void> {
  await writeAuditEvent({
    userId,
    userRole,
    action,
    entityType,
    entityId,
    before,
    after,
    metadata,
    client,
    throwOnError: true,
  });
}
