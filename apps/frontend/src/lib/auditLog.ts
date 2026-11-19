import { type AuditAction, Prisma, type PrivilegeLevel } from "@prisma/client";
import prisma from "./prisma";

export const SYSTEM_USER_ID = "system";
type AuditLogClient = {
  auditLog: {
    create: (args: Prisma.AuditLogCreateArgs) => Promise<unknown>;
  };
};
type AuditLogManyClient = {
  auditLog: {
    createMany: (args: Prisma.AuditLogCreateManyArgs) => Promise<unknown>;
  };
};

type AuditMetadata = Record<string, unknown> | Prisma.InputJsonValue;

/** One audit row, before it is shaped for the AuditLog table. */
export type AuditEvent = {
  userId: string;
  userRole: PrivilegeLevel;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: AuditMetadata;
};

type WriteAuditEventParams = AuditEvent & {
  client?: AuditLogClient;
  throwOnError?: boolean;
};

/** Shapes an event as an AuditLog row. Shared by the single and batch writers so they can't drift. */
function buildAuditLogRow({
  userId,
  userRole,
  action,
  entityType,
  entityId,
  before,
  after,
  metadata,
}: AuditEvent): Prisma.AuditLogCreateManyInput {
  const beforeValue =
    before === null
      ? Prisma.JsonNull
      : (before as unknown as Prisma.InputJsonValue);
  const afterValue =
    after === null
      ? Prisma.JsonNull
      : (after as unknown as Prisma.InputJsonValue);
  const metadataValue = metadata as Prisma.InputJsonValue | undefined;
  return {
    userId,
    userRole,
    action,
    entityType,
    entityId,
    beforeValue,
    afterValue,
    metadata: metadataValue,
  };
}

async function writeAuditEvent({
  client = prisma,
  throwOnError = false,
  ...event
}: WriteAuditEventParams): Promise<void> {
  try {
    await client.auditLog.create({ data: buildAuditLogRow(event) });
  } catch (error) {
    console.error(
      `Failed to log audit event: action=${event.action}, entityType=${event.entityType}, entityId=${event.entityId}`,
      error,
    );
    if (throwOnError) {
      throw error;
    }
  }
}

/** Best-effort audit for non-compliance-critical events (reference/config data, diagnostics). */
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

/** Fail-closed audit for compliance-critical durable state changes (membership, petitions, etc.). */
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

/**
 * Fail-closed batch audit: writes every event in one createMany, for a bulk change that
 * would otherwise be one round trip per row. Same row shape as logAuditEventOrThrow.
 */
export async function logAuditEventsOrThrow(
  events: AuditEvent[],
  client: AuditLogManyClient = prisma,
): Promise<void> {
  if (events.length === 0) return;
  try {
    await client.auditLog.createMany({ data: events.map(buildAuditLogRow) });
  } catch (error) {
    const actions = Array.from(new Set(events.map((event) => event.action)));
    console.error(
      `Failed to log ${events.length} audit events: actions=${actions.join(",")}`,
      error,
    );
    throw error;
  }
}
