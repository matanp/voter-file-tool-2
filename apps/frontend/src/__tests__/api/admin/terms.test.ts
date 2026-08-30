/**
 * Tests for GET/POST /api/admin/terms and PATCH/PUT /api/admin/terms/[id].
 * Covers Admin-only auth, create/update validation, set-active, and audit writes.
 */

import { Prisma, PrivilegeLevel, type CommitteeTerm } from "@prisma/client";
import { GET, POST } from "~/app/api/admin/terms/route";
import { PATCH, PUT } from "~/app/api/admin/terms/[id]/route";
import { parseCalendarDate } from "~/lib/dateUtils";
import {
  createAuthTestSuite,
  createMockRequest,
  createMockSession,
  expectAuditLogCreate,
  expectErrorResponse,
  getAuditLogMock,
  parseJsonResponse,
  type AuthTestConfig,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

const TERM_ID = "term-2026-2028";
const OTHER_TERM_ID = "term-2024-2026";

const validPayload = {
  label: "2026–2028",
  startDate: "2026-01-01",
  endDate: "2028-12-31",
};

const committeeTermMock = prismaMock.committeeTerm as {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
};

/** Builds a CommitteeTerm row for Prisma mock return values. */
function createMockTerm(overrides: Partial<CommitteeTerm> = {}): CommitteeTerm {
  return {
    id: TERM_ID,
    label: "2026–2028",
    startDate:
      parseCalendarDate("2026-01-01") ?? new Date("2026-01-01T12:00:00.000Z"),
    endDate:
      parseCalendarDate("2028-12-31") ?? new Date("2028-12-31T12:00:00.000Z"),
    isActive: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("/api/admin/terms", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAuditLogMock(prismaMock).create.mockResolvedValue({});
  });

  describe("GET /api/admin/terms", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/admin/terms GET",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () => createMockRequest({}, {}, { method: "GET" }),
      };

      const setupMocks = () => {
        committeeTermMock.findMany.mockResolvedValue([]);
      };

      const authTestSuite = createAuthTestSuite(
        authConfig,
        GET,
        mockAuthSession,
        mockHasPermission,
        setupMocks,
      );

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });

    it("returns terms ordered by start date", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      const terms = [createMockTerm()];
      committeeTermMock.findMany.mockResolvedValue(terms);

      const response = await GET(createMockRequest({}, {}, { method: "GET" }));
      expect(response.status).toBe(200);
      const json = await parseJsonResponse<Array<{ id: string }>>(response);
      expect(json).toHaveLength(1);
      expect(json[0]?.id).toBe(TERM_ID);
      expect(committeeTermMock.findMany).toHaveBeenCalledWith({
        orderBy: { startDate: "desc" },
      });
    });
  });

  describe("POST /api/admin/terms", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/admin/terms POST",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () => createMockRequest(validPayload),
      };

      const setupMocks = () => {
        committeeTermMock.findUnique.mockResolvedValue(null);
        committeeTermMock.create.mockResolvedValue(createMockTerm());
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

    it("creates a term and logs TERM_CREATED", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      committeeTermMock.findUnique.mockResolvedValue(null);
      committeeTermMock.create.mockResolvedValue(createMockTerm());

      const response = await POST(createMockRequest(validPayload));
      expect(response.status).toBe(201);
      const json = await parseJsonResponse<{ id: string; label: string }>(
        response,
      );
      expect(json.label).toBe("2026–2028");
      expect(committeeTermMock.create).toHaveBeenCalledWith({
        data: {
          label: "2026–2028",
          startDate: parseCalendarDate("2026-01-01"),
          endDate: parseCalendarDate("2028-12-31"),
          isActive: false,
        },
      });
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({ action: "TERM_CREATED" }),
      );
    });

    it("returns 409 when the label already exists", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      committeeTermMock.findUnique.mockResolvedValue(createMockTerm());

      const response = await POST(createMockRequest(validPayload));
      await expectErrorResponse(
        response,
        409,
        "Term with this label already exists",
      );
    });

    it("returns 409 on Prisma P2002 unique constraint violation", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      committeeTermMock.findUnique.mockResolvedValue(null);
      committeeTermMock.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "5.0.0",
        }),
      );

      const response = await POST(createMockRequest(validPayload));
      await expectErrorResponse(
        response,
        409,
        "Term with this label already exists",
      );
    });

    it("returns 400 when end date is not after start date", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      const response = await POST(
        createMockRequest({
          label: "2026–2028",
          startDate: "2028-01-01",
          endDate: "2026-01-01",
        }),
      );
      await expectErrorResponse(
        response,
        400,
        "End date must be after start date",
      );
    });

    it("fails closed with 500 when the audit write fails", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      committeeTermMock.findUnique.mockResolvedValue(null);
      committeeTermMock.create.mockResolvedValue(createMockTerm());
      getAuditLogMock(prismaMock).create.mockRejectedValue(
        new Error("audit unavailable"),
      );

      const response = await POST(createMockRequest(validPayload));
      await expectErrorResponse(response, 500, "Internal Server Error");
    });

    it("returns 422 on invalid payload", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      const response = await POST(createMockRequest({ label: "" }));
      await expectErrorResponse(response, 422, "Invalid request data");
    });
  });
});

describe("/api/admin/terms/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPermission(true);
    getAuditLogMock(prismaMock).create.mockResolvedValue({});
  });

  describe("PATCH /api/admin/terms/[id]", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/admin/terms/[id] PATCH",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () =>
          createMockRequest(undefined, {}, { method: "PATCH" }),
      };

      const setupMocks = () => {
        committeeTermMock.findUnique.mockResolvedValue(createMockTerm());
        committeeTermMock.findFirst.mockResolvedValue(
          createMockTerm({ id: OTHER_TERM_ID, isActive: true }),
        );
        committeeTermMock.updateMany.mockResolvedValue({ count: 1 });
        committeeTermMock.update.mockResolvedValue(
          createMockTerm({ isActive: true }),
        );
      };

      const authTestSuite = createAuthTestSuite(
        authConfig,
        (req) => PATCH(req, routeContext(TERM_ID)),
        mockAuthSession,
        mockHasPermission,
        setupMocks,
      );

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });

    it("activates the term, deactivates others, and logs TERM_UPDATED", async () => {
      committeeTermMock.findUnique.mockResolvedValue(createMockTerm());
      committeeTermMock.findFirst.mockResolvedValue(
        createMockTerm({ id: OTHER_TERM_ID, isActive: true }),
      );
      committeeTermMock.updateMany.mockResolvedValue({ count: 1 });
      committeeTermMock.update.mockResolvedValue(
        createMockTerm({ isActive: true }),
      );

      const response = await PATCH(
        createMockRequest(undefined, {}, { method: "PATCH" }),
        routeContext(TERM_ID),
      );
      expect(response.status).toBe(200);
      const json = await parseJsonResponse<{
        success: boolean;
        activeTermId: string;
      }>(response);
      expect(json).toEqual({ success: true, activeTermId: TERM_ID });
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({ action: "TERM_UPDATED" }),
      );
    });

    it("fails closed with 500 when the audit write fails", async () => {
      committeeTermMock.findUnique.mockResolvedValue(createMockTerm());
      committeeTermMock.findFirst.mockResolvedValue(
        createMockTerm({ id: OTHER_TERM_ID, isActive: true }),
      );
      committeeTermMock.updateMany.mockResolvedValue({ count: 1 });
      committeeTermMock.update.mockResolvedValue(
        createMockTerm({ isActive: true }),
      );
      getAuditLogMock(prismaMock).create.mockRejectedValue(
        new Error("audit unavailable"),
      );

      const response = await PATCH(
        createMockRequest(undefined, {}, { method: "PATCH" }),
        routeContext(TERM_ID),
      );
      await expectErrorResponse(response, 500, "Internal Server Error");
    });

    it("returns 404 when the term does not exist", async () => {
      committeeTermMock.findUnique.mockResolvedValue(null);

      const response = await PATCH(
        createMockRequest(undefined, {}, { method: "PATCH" }),
        routeContext("missing"),
      );
      await expectErrorResponse(response, 404, "Term not found");
    });
  });

  describe("PUT /api/admin/terms/[id]", () => {
    const updatedPayload = {
      label: "2026–2028 (corrected)",
      startDate: "2026-02-01",
      endDate: "2028-11-30",
    };

    /** Resolves findUnique by id vs label for update uniqueness checks. */
    function mockFindUniqueForUpdate(
      existing: CommitteeTerm,
      labelMatch: CommitteeTerm | null = existing,
    ) {
      committeeTermMock.findUnique.mockImplementation(
        async ({ where }: { where: { id?: string; label?: string } }) => {
          if (where.id === existing.id) {
            return existing;
          }
          if (where.label != null) {
            return labelMatch?.label === where.label ? labelMatch : null;
          }
          return null;
        },
      );
    }

    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/admin/terms/[id] PUT",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () =>
          createMockRequest(updatedPayload, {}, { method: "PUT" }),
      };

      const setupMocks = () => {
        const existing = createMockTerm();
        mockFindUniqueForUpdate(existing);
        committeeTermMock.update.mockResolvedValue(
          createMockTerm({
            label: updatedPayload.label,
            startDate:
              parseCalendarDate(updatedPayload.startDate) ?? existing.startDate,
            endDate:
              parseCalendarDate(updatedPayload.endDate) ?? existing.endDate,
          }),
        );
      };

      const authTestSuite = createAuthTestSuite(
        authConfig,
        (req) => PUT(req, routeContext(TERM_ID)),
        mockAuthSession,
        mockHasPermission,
        setupMocks,
      );

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });

    it("updates label and dates and logs TERM_UPDATED", async () => {
      const existing = createMockTerm();
      mockFindUniqueForUpdate(existing);
      const updated = createMockTerm({
        label: updatedPayload.label,
        startDate:
          parseCalendarDate(updatedPayload.startDate) ?? existing.startDate,
        endDate: parseCalendarDate(updatedPayload.endDate) ?? existing.endDate,
      });
      committeeTermMock.update.mockResolvedValue(updated);

      const response = await PUT(
        createMockRequest(updatedPayload, {}, { method: "PUT" }),
        routeContext(TERM_ID),
      );
      expect(response.status).toBe(200);
      const json = await parseJsonResponse<{ label: string }>(response);
      expect(json.label).toBe(updatedPayload.label);
      expect(committeeTermMock.update).toHaveBeenCalledWith({
        where: { id: TERM_ID },
        data: {
          label: updatedPayload.label,
          startDate: parseCalendarDate(updatedPayload.startDate),
          endDate: parseCalendarDate(updatedPayload.endDate),
        },
      });
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({ action: "TERM_UPDATED" }),
      );
    });

    it("allows keeping the same label", async () => {
      const existing = createMockTerm();
      mockFindUniqueForUpdate(existing);
      committeeTermMock.update.mockResolvedValue(existing);

      const response = await PUT(
        createMockRequest(validPayload, {}, { method: "PUT" }),
        routeContext(TERM_ID),
      );
      expect(response.status).toBe(200);
      expect(committeeTermMock.update).toHaveBeenCalled();
    });

    it("fails closed with 500 when the audit write fails", async () => {
      const existing = createMockTerm();
      mockFindUniqueForUpdate(existing);
      committeeTermMock.update.mockResolvedValue(existing);
      getAuditLogMock(prismaMock).create.mockRejectedValue(
        new Error("audit unavailable"),
      );

      const response = await PUT(
        createMockRequest(updatedPayload, {}, { method: "PUT" }),
        routeContext(TERM_ID),
      );
      await expectErrorResponse(response, 500, "Internal Server Error");
    });

    it("returns 404 when the term does not exist", async () => {
      committeeTermMock.findUnique.mockResolvedValue(null);

      const response = await PUT(
        createMockRequest(updatedPayload, {}, { method: "PUT" }),
        routeContext("missing"),
      );
      await expectErrorResponse(response, 404, "Term not found");
      expect(committeeTermMock.update).not.toHaveBeenCalled();
    });

    it("returns 409 when another term already has the label", async () => {
      const existing = createMockTerm();
      mockFindUniqueForUpdate(
        existing,
        createMockTerm({ id: OTHER_TERM_ID, label: updatedPayload.label }),
      );

      const response = await PUT(
        createMockRequest(updatedPayload, {}, { method: "PUT" }),
        routeContext(TERM_ID),
      );
      await expectErrorResponse(
        response,
        409,
        "Term with this label already exists",
      );
      expect(committeeTermMock.update).not.toHaveBeenCalled();
    });

    it("returns 400 when end date is not after start date", async () => {
      const response = await PUT(
        createMockRequest(
          {
            label: "2026–2028",
            startDate: "2028-01-01",
            endDate: "2026-01-01",
          },
          {},
          { method: "PUT" },
        ),
        routeContext(TERM_ID),
      );
      await expectErrorResponse(
        response,
        400,
        "End date must be after start date",
      );
    });

    it("returns 422 on invalid payload", async () => {
      const response = await PUT(
        createMockRequest({ label: "" }, {}, { method: "PUT" }),
        routeContext(TERM_ID),
      );
      await expectErrorResponse(response, 422, "Invalid request data");
    });
  });
});
