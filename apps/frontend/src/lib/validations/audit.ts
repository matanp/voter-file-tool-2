import { AuditAction } from "@prisma/client";
import { z } from "zod";

const optionalNonEmptyString = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (value == null || value === "") return undefined;
    return value;
  });

const optionalIsoDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (value == null || value === "") return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : value;
  });

const coercePage = z.preprocess(
  (v) => {
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  },
  z.number().int().min(1).optional(),
);
const coercePageSize = z.preprocess(
  (v) => {
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  },
  z.number().int().min(1).max(100).optional(),
);

/** Query schema for GET /api/admin/audit (list). */
export const auditListQuerySchema = z
  .object({
    page: coercePage.default(1),
    pageSize: coercePageSize.default(25),
    action: z.nativeEnum(AuditAction).optional(),
    entityType: optionalNonEmptyString,
    userId: optionalNonEmptyString,
    dateFrom: optionalIsoDate,
    dateTo: optionalIsoDate,
    sortBy: z.enum(["timestamp", "action"]).optional().default("timestamp"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

/** Query schema for GET /api/admin/audit/export (filters only, no pagination). */
export const auditExportQuerySchema = z
  .object({
    format: z.enum(["csv", "xlsx"]).optional().default("csv"),
    action: z.nativeEnum(AuditAction).optional(),
    entityType: optionalNonEmptyString,
    userId: optionalNonEmptyString,
    dateFrom: optionalIsoDate,
    dateTo: optionalIsoDate,
  })
  .strict();

export type AuditListQuery = z.infer<typeof auditListQuerySchema>;
export type AuditExportQuery = z.infer<typeof auditExportQuerySchema>;
