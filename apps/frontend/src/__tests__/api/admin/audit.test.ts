import { NextRequest } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { GET as listAudit } from "~/app/api/admin/audit/route";
import { GET as getAuditDetail } from "~/app/api/admin/audit/[id]/route";
import { GET as exportAudit } from "~/app/api/admin/audit/export/route";
import { GET as getAuditUsers } from "~/app/api/admin/audit/users/route";
import {
  createMockRequest,
  createMockSession,
  parseJsonResponse,
  getAuditLogMock,
} from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../utils/mocks";

const mockUser = { id: "user-1", name: "Admin User", email: "admin@test.org" };
const mockAuditEntry = {
  id: "audit-1",
  userId: "user-1",
  userRole: PrivilegeLevel.Admin,
  action: "MEMBER_ACTIVATED" as const,
  entityType: "CommitteeMembership",
  entityId: "cm-123",
  timestamp: new Date("2026-02-20T12:00:00.000Z"),
  beforeValue: null,
  afterValue: { status: "ACTIVE" },
  metadata: null,
  user: mockUser,
};

function createListRequest(searchParams: Record<string, string> = {}) {
  return createMockRequest({}, searchParams, { method: "GET" }) as NextRequest;
}

function detailRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("/api/admin/audit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPermission(true);
  });

  describe("GET /api/admin/audit (list)", () => {
    it("returns paginated items with default page and pageSize", async () => {
      getAuditLogMock(prismaMock).findMany.mockResolvedValue([mockAuditEntry]);
      getAuditLogMock(prismaMock).count.mockResolvedValue(1);

      const res = await listAudit(createListRequest());

      expect(res.status).toBe(200);
      const body = await parseJsonResponse<{
        items: unknown[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>(res);
      expect(body.items).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(25);
      expect(body.totalPages).toBe(1);
      expect(getAuditLogMock(prismaMock).findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { user: { select: { name: true, email: true } } },
          skip: 0,
          take: 25,
          orderBy: { timestamp: "desc" },
        }),
      );
    });

    it("applies action filter", async () => {
      getAuditLogMock(prismaMock).findMany.mockResolvedValue([]);
      getAuditLogMock(prismaMock).count.mockResolvedValue(0);

      await listAudit(createListRequest({ action: "MEMBER_REMOVED" }));

      expect(getAuditLogMock(prismaMock).findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: "MEMBER_REMOVED" }),
        }),
      );
    });

    it("applies entityType, userId, dateFrom, dateTo filters", async () => {
      getAuditLogMock(prismaMock).findMany.mockResolvedValue([]);
      getAuditLogMock(prismaMock).count.mockResolvedValue(0);

      await listAudit(
        createListRequest({
          entityType: "MeetingRecord",
          userId: "user-1",
          dateFrom: "2026-02-01",
          dateTo: "2026-02-28",
        }),
      );

      const where = getAuditLogMock(prismaMock).findMany.mock
        .calls[0]?.[0]?.where as Record<string, unknown>;
      expect(where.entityType).toBe("MeetingRecord");
      expect(where.userId).toBe("user-1");
      expect(where.timestamp).toBeDefined();
    });

    it("applies pagination (page 2, pageSize 50)", async () => {
      getAuditLogMock(prismaMock).findMany.mockResolvedValue([]);
      getAuditLogMock(prismaMock).count.mockResolvedValue(100);

      const res = await listAudit(
        createListRequest({ page: "2", pageSize: "50" }),
      );

      expect(res.status).toBe(200);
      const body = await parseJsonResponse<{ page: number; pageSize: number; totalPages: number }>(res);
      expect(body.page).toBe(2);
      expect(body.pageSize).toBe(50);
      expect(body.totalPages).toBe(2);
      expect(getAuditLogMock(prismaMock).findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 50, take: 50 }),
      );
    });

    it("returns 403 when user is not Admin", async () => {
      mockHasPermission(false);

      const res = await listAudit(createListRequest());

      expect(res.status).toBe(403);
      expect(getAuditLogMock(prismaMock).findMany).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/admin/audit/[id] (detail)", () => {
    it("returns full entry including beforeValue and afterValue", async () => {
      getAuditLogMock(prismaMock).findUnique.mockResolvedValue({
        ...mockAuditEntry,
        beforeValue: { status: "SUBMITTED" },
        afterValue: { status: "ACTIVE" },
        metadata: { note: "Accepted" },
      });

      const res = await getAuditDetail(
        createMockRequest() as NextRequest,
        detailRouteContext("audit-1"),
      );

      expect(res.status).toBe(200);
      const body = await parseJsonResponse<{
        id: string;
        beforeValue: unknown;
        afterValue: unknown;
        metadata: unknown;
      }>(res);
      expect(body.id).toBe("audit-1");
      expect(body.beforeValue).toEqual({ status: "SUBMITTED" });
      expect(body.afterValue).toEqual({ status: "ACTIVE" });
      expect(body.metadata).toEqual({ note: "Accepted" });
    });

    it("returns 404 when entry not found", async () => {
      getAuditLogMock(prismaMock).findUnique.mockResolvedValue(null);

      const res = await getAuditDetail(
        createMockRequest() as NextRequest,
        detailRouteContext("nonexistent"),
      );

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/admin/audit/export", () => {
    it("returns CSV with correct columns when format=csv", async () => {
      getAuditLogMock(prismaMock).count.mockResolvedValue(2);
      const row1 = {
        ...mockAuditEntry,
        timestamp: new Date("2026-02-20T12:00:00.000Z"),
        user: { name: "Admin User", email: "admin@test.org" },
      };
      const row2 = { ...row1, id: "audit-2" };
      getAuditLogMock(prismaMock).findMany.mockResolvedValue([row1, row2]);

      const res = await exportAudit(
        createListRequest({ format: "csv" }) as NextRequest,
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/csv");
      expect(res.headers.get("Content-Disposition")).toContain("attachment");
      const text = await res.text();
      expect(text).toContain("Timestamp");
      expect(text).toContain("User Name");
      expect(text).toContain("Summary");
    });

    it("returns 400 when more than 10,000 records match", async () => {
      getAuditLogMock(prismaMock).count.mockResolvedValue(15000);

      const res = await exportAudit(
        createListRequest({ format: "csv" }) as NextRequest,
      );

      expect(res.status).toBe(400);
      const body = await parseJsonResponse<{ error: string }>(res);
      expect(body.error).toContain("Too many records");
      expect(getAuditLogMock(prismaMock).findMany).not.toHaveBeenCalled();
    });

    it("returns 403 when user is not Admin", async () => {
      mockHasPermission(false);

      const res = await exportAudit(
        createListRequest({ format: "csv" }) as NextRequest,
      );

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/admin/audit/users", () => {
    it("returns distinct users from audit log", async () => {
      getAuditLogMock(prismaMock).findMany
        .mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }]);
      (prismaMock.user.findMany as jest.Mock).mockResolvedValue([
        { id: "u1", name: "Alice", email: "a@test.org" },
        { id: "u2", name: "Bob", email: "b@test.org" },
      ]);

      const res = await getAuditUsers(createMockRequest() as NextRequest);

      expect(res.status).toBe(200);
      const body = await parseJsonResponse<{ users: Array<{ id: string; name: string | null; email: string }> }>(res);
      expect(body.users).toHaveLength(2);
      expect(body.users?.map((u) => u.email)).toEqual(["a@test.org", "b@test.org"]);
    });

    it("returns empty users when no audit logs", async () => {
      getAuditLogMock(prismaMock).findMany.mockResolvedValue([]);

      const res = await getAuditUsers(createMockRequest() as NextRequest);

      expect(res.status).toBe(200);
      const body = await parseJsonResponse<{ users: unknown[] }>(res);
      expect(body.users).toEqual([]);
      expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    });
  });
});
