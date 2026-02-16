/**
 * Tests for GET and POST /api/admin/electionDates.
 * Tested: 401/403 auth (Admin only), success paths, 409 duplicate, 400 invalid date, 500 errors.
 */
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { GET, POST } from "~/app/api/admin/electionDates/route";
import { NextRequest } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockRequest,
  createAuthTestSuite,
  expectErrorResponse,
  type AuthTestConfig,
} from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../utils/mocks";

describe("/api/admin/electionDates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/electionDates", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/admin/electionDates GET",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () =>
          new NextRequest("http://localhost:3000/api/admin/electionDates"),
      };

      const setupMocks = () => {
        prismaMock.electionDate.findMany.mockResolvedValue([]);
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

    it("should return election dates on success", async () => {
      const mockDates = [
        { id: 1, date: new Date("2024-11-05") },
        { id: 2, date: new Date("2025-01-01") },
      ];
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.electionDate.findMany.mockResolvedValue(mockDates as never);

      const request = new NextRequest(
        "http://localhost:3000/api/admin/electionDates",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toHaveLength(2);
      expect(prismaMock.electionDate.findMany).toHaveBeenCalledWith({
        orderBy: { date: "asc" },
      });
    });

    it("should return 500 on database error", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.electionDate.findMany.mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/admin/electionDates",
      );
      const response = await GET(request);

      await expectErrorResponse(response, 500, "Internal Server Error");
    });
  });

  describe("POST /api/admin/electionDates", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/admin/electionDates POST",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () =>
          createMockRequest({ date: "2025-06-15" }),
      };

      const setupMocks = () => {
        prismaMock.electionDate.findFirst.mockResolvedValue(null);
        prismaMock.electionDate.create.mockResolvedValue({
          id: 1,
          date: new Date("2025-06-15"),
        } as never);
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

    it("should create election date and return 201", async () => {
      const newDate = { id: 1, date: new Date("2025-06-15T00:00:00.000Z") };
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.electionDate.findFirst.mockResolvedValue(null);
      prismaMock.electionDate.create.mockResolvedValue(newDate as never);

      const request = createMockRequest({ date: "2025-06-15" });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json).toMatchObject({ id: 1 });
    });

    it("should return 409 when date already exists", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.electionDate.findFirst.mockResolvedValue({
        id: 1,
        date: new Date("2025-06-15"),
      } as never);

      const request = createMockRequest({ date: "2025-06-15" });
      const response = await POST(request);

      await expectErrorResponse(response, 409, "Election date already exists");
    });

    it("should return 400 for invalid date string", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      const request = createMockRequest({ date: "not-a-date" });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("Invalid input");
    });

    it("should return 409 on Prisma P2002 unique constraint violation", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.electionDate.findFirst.mockResolvedValue(null);

      // Route checks: error && typeof error === "object" && "code" in error && error.code === "P2002"
      const prismaError = Object.assign(
        new Error("Unique constraint failed"),
        { code: "P2002" },
      );
      prismaMock.electionDate.create.mockRejectedValue(prismaError);

      const request = createMockRequest({ date: "2025-06-15" });
      const response = await POST(request);

      await expectErrorResponse(response, 409, "Election date already exists");
    });
  });
});
