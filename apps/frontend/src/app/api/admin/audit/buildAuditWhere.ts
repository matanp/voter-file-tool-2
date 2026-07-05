import type { AuditAction, Prisma } from "@prisma/client";

/** Build Prisma where clause from validated list/export filters. */
export function buildAuditWhere(filters: {
  action?: AuditAction;
  entityType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Prisma.AuditLogWhereInput {
  const { action, entityType, userId, dateFrom, dateTo } = filters;
  const where: Prisma.AuditLogWhereInput = {};
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (userId) where.userId = userId;
  if (dateFrom) {
    const from = new Date(dateFrom);
    from.setUTCHours(0, 0, 0, 0);
    where.timestamp = { ...((where.timestamp as Prisma.DateTimeFilter) ?? {}), gte: from };
  }
  if (dateTo) {
    const to = new Date(dateTo);
    to.setUTCHours(23, 59, 59, 999);
    const existing = where.timestamp as Prisma.DateTimeFilter | undefined;
    where.timestamp = existing ? { ...existing, lte: to } : { lte: to };
  }
  return where;
}
