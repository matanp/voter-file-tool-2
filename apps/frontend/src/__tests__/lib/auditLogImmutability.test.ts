import type { Prisma } from "@prisma/client";
import { auditLogImmutabilityGuard } from "~/lib/auditLogGuard";

/**
 * Creates minimal Prisma middleware params for testing.
 */
function createParams(
  model: string,
  action: string,
): Prisma.MiddlewareParams {
  return {
    model,
    action,
    args: {},
    runInTransaction: false,
  } as Prisma.MiddlewareParams;
}

describe("auditLogImmutabilityGuard", () => {
  it("throws when prisma.auditLog.update() is attempted", async () => {
    const params = createParams("AuditLog", "update");
    const next = jest.fn();

    await expect(
      auditLogImmutabilityGuard(params, next),
    ).rejects.toThrow("AuditLog is immutable: update operations are not allowed");

    expect(next).not.toHaveBeenCalled();
  });

  it("throws when prisma.auditLog.updateMany() is attempted", async () => {
    const params = createParams("AuditLog", "updateMany");
    const next = jest.fn();

    await expect(
      auditLogImmutabilityGuard(params, next),
    ).rejects.toThrow(
      "AuditLog is immutable: updateMany operations are not allowed",
    );

    expect(next).not.toHaveBeenCalled();
  });

  it("throws when prisma.auditLog.delete() is attempted", async () => {
    const params = createParams("AuditLog", "delete");
    const next = jest.fn();

    await expect(
      auditLogImmutabilityGuard(params, next),
    ).rejects.toThrow("AuditLog is immutable: delete operations are not allowed");

    expect(next).not.toHaveBeenCalled();
  });

  it("throws when prisma.auditLog.deleteMany() is attempted", async () => {
    const params = createParams("AuditLog", "deleteMany");
    const next = jest.fn();

    await expect(
      auditLogImmutabilityGuard(params, next),
    ).rejects.toThrow(
      "AuditLog is immutable: deleteMany operations are not allowed",
    );

    expect(next).not.toHaveBeenCalled();
  });

  it("allows auditLog.create and passes through to next", async () => {
    const params = createParams("AuditLog", "create");
    const next = jest.fn().mockResolvedValue({ id: "new-audit-id" });

    const result = await auditLogImmutabilityGuard(params, next);

    expect(next).toHaveBeenCalledWith(params);
    expect(result).toEqual({ id: "new-audit-id" });
  });

  it("does not affect prisma.user.update()", async () => {
    const params = createParams("User", "update");
    const next = jest.fn().mockResolvedValue({ id: "user-1" });

    const result = await auditLogImmutabilityGuard(params, next);

    expect(next).toHaveBeenCalledWith(params);
    expect(result).toEqual({ id: "user-1" });
  });

  it("does not affect prisma.user.delete()", async () => {
    const params = createParams("User", "delete");
    const next = jest.fn().mockResolvedValue({ id: "user-1" });

    const result = await auditLogImmutabilityGuard(params, next);

    expect(next).toHaveBeenCalledWith(params);
    expect(result).toEqual({ id: "user-1" });
  });
});
