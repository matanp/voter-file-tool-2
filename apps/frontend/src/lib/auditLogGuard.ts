import type { Prisma } from "@prisma/client";

/**
 * Prisma middleware that enforces AuditLog immutability at runtime.
 * Prevents update and delete operations on the AuditLog model.
 */
export async function auditLogImmutabilityGuard(
  params: Prisma.MiddlewareParams,
  next: (params: Prisma.MiddlewareParams) => Promise<unknown>,
): Promise<unknown> {
  if (
    params.model === "AuditLog" &&
    (params.action === "update" ||
      params.action === "updateMany" ||
      params.action === "delete" ||
      params.action === "deleteMany" ||
      params.action === "upsert")
  ) {
    throw new Error(
      "AuditLog is immutable: update, updateMany, delete, deleteMany, upsert operations are not allowed",
    );
  }
  return next(params);
}
