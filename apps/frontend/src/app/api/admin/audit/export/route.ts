import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";
import * as xlsx from "xlsx";
import prisma from "~/lib/prisma";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { auditExportQuerySchema } from "~/lib/validations/audit";
import { buildAuditWhere } from "../route";
import { buildSummary, AUDIT_ACTION_LABELS } from "~/app/admin/audit/auditUtils";

const EXPORT_ROW_LIMIT = 10_000;

async function getAuditExportHandler(req: NextRequest, _session: Session) {
  const { searchParams } = new URL(req.url);
  const queryInput = {
    format: searchParams.get("format") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    entityType: searchParams.get("entityType") ?? undefined,
    userId: searchParams.get("userId") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  };

  const validation = validateRequest(queryInput, auditExportQuerySchema);
  if (!validation.success) {
    return validation.response;
  }

  const { format, action, entityType, userId, dateFrom, dateTo } = validation.data;
  const where = buildAuditWhere({ action, entityType, userId, dateFrom, dateTo });

  try {
    const count = await prisma.auditLog.count({ where });
    if (count > EXPORT_ROW_LIMIT) {
      return NextResponse.json(
        { error: "Too many records — narrow your filters." },
        { status: 400 },
      );
    }

    const rows = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { timestamp: "desc" },
      take: EXPORT_ROW_LIMIT,
    });

    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const header = [
        "Timestamp",
        "User Name",
        "User Email",
        "User Role",
        "Action",
        "Entity Type",
        "Entity ID",
        "Summary",
      ];
      const csvRows = [
        header.join(","),
        ...rows.map((r) => {
          const summary = buildSummary({
            action: r.action,
            entityType: r.entityType,
            entityId: r.entityId,
            beforeValue: r.beforeValue as Record<string, unknown> | null,
            afterValue: r.afterValue as Record<string, unknown> | null,
            metadata: r.metadata as Record<string, unknown> | null,
          });
          const escape = (v: string) =>
            /[,"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
          return [
            r.timestamp.toISOString(),
            escape(r.user.name ?? ""),
            escape(r.user.email),
            r.userRole,
            AUDIT_ACTION_LABELS[r.action] ?? r.action,
            r.entityType,
            r.entityId,
            escape(summary),
          ].join(",");
        }),
      ];
      const body = csvRows.join("\n");
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-export-${timestamp}.csv"`,
        },
      });
    }

    // XLSX
    const header = [
      "Timestamp",
      "User Name",
      "User Email",
      "User Role",
      "Action",
      "Entity Type",
      "Entity ID",
      "Summary",
      "Before Value",
      "After Value",
      "Metadata",
    ];
    const data = rows.map((r) => {
      const summary = buildSummary({
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        beforeValue: r.beforeValue as Record<string, unknown> | null,
        afterValue: r.afterValue as Record<string, unknown> | null,
        metadata: r.metadata as Record<string, unknown> | null,
      });
      return [
        r.timestamp.toISOString(),
        r.user.name ?? "",
        r.user.email,
        r.userRole,
        AUDIT_ACTION_LABELS[r.action] ?? r.action,
        r.entityType,
        r.entityId,
        summary,
        r.beforeValue != null ? JSON.stringify(r.beforeValue) : "",
        r.afterValue != null ? JSON.stringify(r.afterValue) : "",
        r.metadata != null ? JSON.stringify(r.metadata) : "",
      ];
    });
    const ws = xlsx.utils.aoa_to_sheet([header, ...data]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Audit Log");
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="audit-export-${timestamp}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Failed to export audit log:", error);
    return NextResponse.json(
      { error: "Failed to export audit log" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Admin, getAuditExportHandler);
