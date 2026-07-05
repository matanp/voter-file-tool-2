import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";
import prisma from "~/lib/prisma";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { auditListQuerySchema } from "~/lib/validations/audit";
import { buildAuditWhere } from "./buildAuditWhere";

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
