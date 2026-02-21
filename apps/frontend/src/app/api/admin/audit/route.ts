import { type NextRequest, NextResponse } from "next/server";
import { type AuditAction, PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";
import prisma from "~/lib/prisma";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { auditListQuerySchema } from "~/lib/validations/audit";
import type { Prisma } from "@prisma/client";

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

/** Handles GET /api/admin/audit: returns a paginated, filterable audit log list. */
async function getAuditListHandler(req: NextRequest, _session: Session) {
  const { searchParams } = new URL(req.url);
  const queryInput = {
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    entityType: searchParams.get("entityType") ?? undefined,
    userId: searchParams.get("userId") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    sortOrder: searchParams.get("sortOrder") ?? undefined,
  };

  const validation = validateRequest(queryInput, auditListQuerySchema);
  if (!validation.success) {
    return validation.response;
  }

  const {
    page = 1,
    pageSize = 25,
    action,
    entityType,
    userId,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
  } = validation.data;

  const where = buildAuditWhere({ action, entityType, userId, dateFrom, dateTo });

  const orderByKey = sortBy === "action" ? ("action" as const) : ("timestamp" as const);

  try {
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { [orderByKey]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error("Failed to list audit log:", error);
    return NextResponse.json(
      { error: "Failed to list audit log" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Admin, getAuditListHandler);
