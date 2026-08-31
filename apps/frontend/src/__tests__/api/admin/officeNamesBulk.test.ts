/**
 * Tests for POST /api/admin/officeNames/bulk.
 *
 * Tested: Admin-only auth gating, happy path, the 50-row cap, the audit row, and the
 * race in which a row passes the precheck but collides at the DB. There is no
 * transaction-rollback test: with `skipDuplicates` and fail-open audit logging, no
 * rollback path remains (spec §Tests).
 */
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { POST } from "~/app/api/admin/officeNames/bulk/route";
import { PrivilegeLevel } from "@prisma/client";
import { MAX_BULK_ROWS } from "~/lib/electionConfigParsing";
import {
  createMockSession,
  createMockRequest,
  createAuthTestSuite,
  expectAuditLogCreate,
  parseJsonResponse,
  type ErrorResponseBody,
  type AuthTestConfig,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

type OfficeNameRecord = { id: number; officeName: string };
type BulkResponse = { created: OfficeNameRecord[]; skipped: string[] };

const officeNameMock = () =>
  prismaMock.officeName as unknown as {
    findMany: jest.Mock;
    createManyAndReturn: jest.Mock;
  };

const asAdmin = () => {
  mockAuthSession(
    createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
  );
  mockHasPermission(true);
};

describe("POST /api/admin/officeNames/bulk", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication tests", () => {
    const authConfig: AuthTestConfig = {
      endpointName: "/api/admin/officeNames/bulk POST",
      requiredPrivilege: PrivilegeLevel.Admin,
      mockRequest: () => createMockRequest({ names: ["Mayor"] }),
    };

    const setupMocks = () => {
      officeNameMock().findMany.mockResolvedValue([]);
      officeNameMock().createManyAndReturn.mockResolvedValue([
        { id: 1, officeName: "Mayor" },
      ]);
    };

    const authTestSuite = createAuthTestSuite(
      authConfig,
      POST,
      mockAuthSession,
      mockHasPermission,
      setupMocks,
      201,
    );

    authTestSuite.forEach(({ description, runTest }) => {
      it(description, runTest);
    });
  });

  it("creates new names and skips existing and in-batch duplicates", async () => {
    asAdmin();
    // "mayor" already exists with different casing — the precheck is case-insensitive.
    officeNameMock().findMany.mockResolvedValue([
      { id: 9, officeName: "mayor" },
    ]);
    officeNameMock().createManyAndReturn.mockResolvedValue([
      { id: 10, officeName: "NYS Assembly" },
      { id: 11, officeName: "Council Member, District 3" },
    ]);

    const request = createMockRequest({
      names: [
        "Mayor",
        "NYS Assembly",
        "nys assembly",
        "Council Member, District 3",
      ],
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const json = await parseJsonResponse<BulkResponse>(response);
    expect(json.created).toHaveLength(2);
    expect(json.skipped).toEqual(
      expect.arrayContaining(["nys assembly", "Mayor"]),
    );
    expect(json.skipped).toHaveLength(2);

    // Casing is preserved as typed; only trimming is applied.
    expect(officeNameMock().createManyAndReturn).toHaveBeenCalledWith({
      data: [
        { officeName: "NYS Assembly" },
        { officeName: "Council Member, District 3" },
      ],
      skipDuplicates: true,
    });
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it("writes one fail-open audit row for the batch", async () => {
    asAdmin();
    officeNameMock().findMany.mockResolvedValue([]);
    officeNameMock().createManyAndReturn.mockResolvedValue([
      { id: 1, officeName: "Mayor" },
    ]);

    const response = await POST(createMockRequest({ names: ["Mayor"] }));

    expect(response.status).toBe(201);
    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "OFFICE_NAMES_BULK_CREATED",
        entityType: "OfficeName",
        entityId: expect.stringMatching(/^bulk-\d+$/) as unknown as string,
        metadata: { createdCount: 1, skippedCount: 0 },
      }),
    );
  });

  it("still returns 201 when the audit write fails (fail-open)", async () => {
    asAdmin();
    officeNameMock().findMany.mockResolvedValue([]);
    officeNameMock().createManyAndReturn.mockResolvedValue([
      { id: 1, officeName: "Mayor" },
    ]);
    (prismaMock.auditLog.create as jest.Mock).mockRejectedValue(
      new Error("audit down"),
    );

    const response = await POST(createMockRequest({ names: ["Mayor"] }));

    expect(response.status).toBe(201);
  });

  it("skips the audit write when nothing was created", async () => {
    asAdmin();
    officeNameMock().findMany.mockResolvedValue([
      { id: 9, officeName: "Mayor" },
    ]);

    const response = await POST(createMockRequest({ names: ["Mayor"] }));

    expect(response.status).toBe(201);
    const json = await parseJsonResponse<BulkResponse>(response);
    expect(json.created).toEqual([]);
    expect(json.skipped).toEqual(["Mayor"]);
    expect(officeNameMock().createManyAndReturn).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects more than MAX_BULK_ROWS names with 400", async () => {
    asAdmin();
    const names = Array.from(
      { length: MAX_BULK_ROWS + 1 },
      (_, i) => `Office ${i}`,
    );

    const response = await POST(createMockRequest({ names }));

    expect(response.status).toBe(400);
    const json = await parseJsonResponse<ErrorResponseBody>(response);
    expect(json.error).toBe("Invalid input");
    expect(officeNameMock().createManyAndReturn).not.toHaveBeenCalled();
  });

  it("rejects a blank name with 400", async () => {
    asAdmin();

    const response = await POST(createMockRequest({ names: ["Mayor", "   "] }));

    expect(response.status).toBe(400);
    expect(officeNameMock().createManyAndReturn).not.toHaveBeenCalled();
  });

  it("reports a row that loses the insert race as skipped, not failed", async () => {
    asAdmin();
    officeNameMock().findMany.mockResolvedValue([]);
    // "Sheriff" passed the precheck but was inserted concurrently; `skipDuplicates`
    // drops it at the DB and it simply comes back absent from `created`.
    officeNameMock().createManyAndReturn.mockResolvedValue([
      { id: 1, officeName: "Mayor" },
    ]);

    const response = await POST(
      createMockRequest({ names: ["Mayor", "Sheriff"] }),
    );

    expect(response.status).toBe(201);
    const json = await parseJsonResponse<BulkResponse>(response);
    expect(json.created.map((r) => r.officeName)).toEqual(["Mayor"]);
    expect(json.skipped).toEqual(["Sheriff"]);
    expect(json).not.toHaveProperty("failed");
  });

  it("returns 500 on an unexpected database error", async () => {
    asAdmin();
    officeNameMock().findMany.mockRejectedValue(new Error("Database error"));

    const response = await POST(createMockRequest({ names: ["Mayor"] }));

    expect(response.status).toBe(500);
  });
});
