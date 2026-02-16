/**
 * Tests for PATCH and DELETE /api/reports/[id].
 * Tested: 401/403 auth, 404/400/403 validation, success paths, 500 errors.
 */
import { PATCH, DELETE } from "~/app/api/reports/[id]/route";
import { NextRequest } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockRequest,
  createAuthTestSuite,
  expectSuccessResponse,
  expectErrorResponse,
  type AuthTestConfig,
} from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../utils/mocks";

const REPORT_ID = "report-123";
const USER_ID = "user-456";

const routeContext = { params: Promise.resolve({ id: REPORT_ID }) };
const routeContextMissingParams = { params: undefined };

function createPatchRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  return createMockRequest(body, {}, { headers: { "Content-Type": "application/json", ...headers } });
}

describe("/api/reports/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("PATCH /api/reports/[id]", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/reports/[id]",
        requiredPrivilege: "Authenticated",
        mockRequest: () =>
          createPatchRequest({ title: "New Title" }),
      };

      const setupMocks = () => {
        prismaMock.report.findFirst.mockResolvedValue({
          id: REPORT_ID,
          generatedById: USER_ID,
        } as never);
        prismaMock.report.updateMany.mockResolvedValue({ count: 1 } as never);
        prismaMock.report.findUnique.mockResolvedValue({
          id: REPORT_ID,
          title: "New Title",
          generatedBy: { id: USER_ID, name: "U", email: "u@e.com" },
        } as never);
      };

      const authTestSuite = createAuthTestSuite(
        authConfig,
        (req) => PATCH(req, routeContext),
        mockAuthSession,
        mockHasPermission,
        setupMocks,
        200,
      );

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });

    it("should return 404 when params missing", async () => {
      mockAuthSession(createMockSession({ user: { id: USER_ID, privilegeLevel: PrivilegeLevel.RequestAccess } }));
      mockHasPermission(true);

      const response = await PATCH(
        createPatchRequest({ title: "New Title" }),
        routeContextMissingParams,
      );

      await expectErrorResponse(response, 404, "Not found");
    });

    it("should return 400 when request body is invalid JSON", async () => {
      mockAuthSession(createMockSession({ user: { id: USER_ID, privilegeLevel: PrivilegeLevel.RequestAccess } }));
      mockHasPermission(true);
      prismaMock.report.findFirst.mockResolvedValue({
        id: REPORT_ID,
        generatedById: USER_ID,
      } as never);

      // Use a request whose .json() method always rejects
      const request = new NextRequest("http://localhost:3000/api/reports/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "this is not json",
      });
      // Override .json() to simulate unparseable body
      jest.spyOn(request, "json").mockRejectedValue(new SyntaxError("Unexpected token"));

      const response = await PATCH(request, routeContext);

      await expectErrorResponse(response, 400, "Invalid JSON");
    });

    it("should return 404 when updateMany returns count 0 (race condition)", async () => {
      mockAuthSession(createMockSession({ user: { id: USER_ID, privilegeLevel: PrivilegeLevel.RequestAccess } }));
      mockHasPermission(true);
      prismaMock.report.findFirst.mockResolvedValue({
        id: REPORT_ID,
        generatedById: USER_ID,
      } as never);
      prismaMock.report.updateMany.mockResolvedValue({ count: 0 } as never);

      const response = await PATCH(
        createPatchRequest({ title: "New Title" }),
        routeContext,
      );

      await expectErrorResponse(
        response,
        404,
        "Report not found or access denied",
      );
    });

    it("should return 500 when updateMany throws in PATCH", async () => {
      mockAuthSession(createMockSession({ user: { id: USER_ID, privilegeLevel: PrivilegeLevel.RequestAccess } }));
      mockHasPermission(true);
      prismaMock.report.findFirst.mockResolvedValue({
        id: REPORT_ID,
        generatedById: USER_ID,
      } as never);
      prismaMock.report.updateMany.mockRejectedValue(new Error("DB error"));

      const response = await PATCH(
        createPatchRequest({ title: "New Title" }),
        routeContext,
      );

      await expectErrorResponse(response, 500, "Internal Server Error");
    });

    it("should return 400 when Content-Type is not application/json", async () => {
      mockAuthSession(createMockSession({ user: { id: USER_ID, privilegeLevel: PrivilegeLevel.RequestAccess } }));
      mockHasPermission(true);
      prismaMock.report.findFirst.mockResolvedValue({
        id: REPORT_ID,
        generatedById: USER_ID,
      } as never);

      const request = createPatchRequest(
        { title: "New Title" },
        { "Content-Type": "text/plain" },
      );
      const response = await PATCH(request, routeContext);

      await expectErrorResponse(
        response,
        400,
        "Content-Type must be application/json",
      );
    });

    it("should return 404 when report not found or not owned", async () => {
      mockAuthSession(createMockSession({ user: { id: USER_ID, privilegeLevel: PrivilegeLevel.RequestAccess } }));
      mockHasPermission(true);
      prismaMock.report.findFirst.mockResolvedValue(null);

      const response = await PATCH(
        createPatchRequest({ title: "New Title" }),
        routeContext,
      );

      await expectErrorResponse(
        response,
        404,
        "Report not found or access denied",
      );
    });

    it("should return 403 when non-admin tries to set public", async () => {
      mockAuthSession(createMockSession({ user: { id: USER_ID, privilegeLevel: PrivilegeLevel.RequestAccess } }));
      mockHasPermission(false);
      prismaMock.report.findFirst.mockResolvedValue({
        id: REPORT_ID,
        generatedById: USER_ID,
      } as never);

      const response = await PATCH(
        createPatchRequest({ public: true }),
        routeContext,
      );

      await expectErrorResponse(
        response,
        403,
        "Only admins can change public status",
      );
    });

    it("should return 400 when no updatable fields provided", async () => {
      mockAuthSession(createMockSession({ user: { id: USER_ID, privilegeLevel: PrivilegeLevel.RequestAccess } }));
      mockHasPermission(true);
      prismaMock.report.findFirst.mockResolvedValue({
        id: REPORT_ID,
        generatedById: USER_ID,
      } as never);

      const response = await PATCH(
        createPatchRequest({}),
        routeContext,
      );

      await expectErrorResponse(
        response,
        400,
        "No updatable fields provided",
      );
    });

    it("should successfully update title", async () => {
      const updatedReport = {
        id: REPORT_ID,
        title: "Updated Title",
        description: null,
        public: false,
        generatedBy: { id: USER_ID, name: "User", email: "u@e.com" },
      };
      mockAuthSession(createMockSession({ user: { id: USER_ID, privilegeLevel: PrivilegeLevel.RequestAccess } }));
      mockHasPermission(true);
      prismaMock.report.findFirst.mockResolvedValue({
        id: REPORT_ID,
        generatedById: USER_ID,
      } as never);
      prismaMock.report.updateMany.mockResolvedValue({ count: 1 } as never);
      prismaMock.report.findUnique.mockResolvedValue(updatedReport as never);

      const response = await PATCH(
        createPatchRequest({ title: "Updated Title" }),
        routeContext,
      );

      expect(response.status).toBe(200);
      const json = (await response.json()) as { report: { title: string } };
      expect(json.report).toMatchObject({ title: "Updated Title" });
      expect(prismaMock.report.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: REPORT_ID,
            generatedById: USER_ID,
            deleted: false,
          },
          data: { title: "Updated Title" },
        }),
      );
    });

    it("should allow admin to update public", async () => {
      const updatedReport = {
        id: REPORT_ID,
        title: "R",
        public: true,
        generatedBy: { id: USER_ID, name: "User", email: "u@e.com" },
      };
      mockAuthSession(createMockSession({
        user: { id: USER_ID, privilegeLevel: PrivilegeLevel.Admin },
      }));
      mockHasPermission(true);
      prismaMock.report.findFirst.mockResolvedValue({
        id: REPORT_ID,
        generatedById: USER_ID,
      } as never);
      prismaMock.report.updateMany.mockResolvedValue({ count: 1 } as never);
      prismaMock.report.findUnique.mockResolvedValue(updatedReport as never);

      const response = await PATCH(
        createPatchRequest({ public: true }),
        routeContext,
      );

      expect(response.status).toBe(200);
      const json = (await response.json()) as { report: { public: boolean } };
      expect(json.report.public).toBe(true);
    });
  });

  describe("DELETE /api/reports/[id]", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/reports/[id] DELETE",
        requiredPrivilege: "Authenticated",
        mockRequest: () => new NextRequest("http://localhost:3000/api/reports/1"),
      };

      const setupMocks = () => {
        prismaMock.report.findFirst.mockResolvedValue({
          id: REPORT_ID,
          generatedById: USER_ID,
        } as never);
        prismaMock.report.updateMany.mockResolvedValue({ count: 1 } as never);
      };

      const authTestSuite = createAuthTestSuite(
        authConfig,
        (req) => DELETE(req, routeContext),
        mockAuthSession,
        mockHasPermission,
        setupMocks,
      );

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });

    it("should return 404 when params missing", async () => {
      mockAuthSession(createMockSession({ user: { id: USER_ID, privilegeLevel: PrivilegeLevel.RequestAccess } }));
      mockHasPermission(true);

      const response = await DELETE(
        new NextRequest("http://localhost:3000/api/reports/1"),
        routeContextMissingParams,
      );

      await expectErrorResponse(response, 404, "Not found");
    });

    it("should return 404 when report not found or not owned", async () => {
      mockAuthSession(createMockSession({ user: { id: USER_ID, privilegeLevel: PrivilegeLevel.RequestAccess } }));
      mockHasPermission(true);
      prismaMock.report.findFirst.mockResolvedValue(null);

      const response = await DELETE(
        new NextRequest("http://localhost:3000/api/reports/1"),
        routeContext,
      );

      await expectErrorResponse(
        response,
        404,
        "Report not found or access denied",
      );
    });

    it("should successfully soft-delete report", async () => {
      mockAuthSession(createMockSession({ user: { id: USER_ID, privilegeLevel: PrivilegeLevel.RequestAccess } }));
      mockHasPermission(true);
      prismaMock.report.findFirst.mockResolvedValue({
        id: REPORT_ID,
        generatedById: USER_ID,
      } as never);
      prismaMock.report.updateMany.mockResolvedValue({ count: 1 } as never);

      const response = await DELETE(
        new NextRequest("http://localhost:3000/api/reports/1"),
        routeContext,
      );

      await expectSuccessResponse(response, { success: true });
      expect(prismaMock.report.updateMany).toHaveBeenCalledWith({
        where: {
          id: REPORT_ID,
          generatedById: USER_ID,
          deleted: false,
        },
        data: { deleted: true },
      });
    });

    it("should return 500 when updateMany throws", async () => {
      mockAuthSession(createMockSession({ user: { id: USER_ID, privilegeLevel: PrivilegeLevel.RequestAccess } }));
      mockHasPermission(true);
      prismaMock.report.findFirst.mockResolvedValue({
        id: REPORT_ID,
        generatedById: USER_ID,
      } as never);
      prismaMock.report.updateMany.mockRejectedValue(new Error("DB error"));

      const response = await DELETE(
        new NextRequest("http://localhost:3000/api/reports/1"),
        routeContext,
      );

      await expectErrorResponse(response, 500, "Internal Server Error");
    });
  });
});
