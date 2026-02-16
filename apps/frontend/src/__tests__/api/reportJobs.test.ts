/**
 * Tests for GET /api/reportJobs.
 * Tested: 401/403 auth, basic success, status filtering, 400 for invalid status,
 * pagination, DB error handling.
 */
import { GET } from "~/app/api/reportJobs/route";
import { NextRequest } from "next/server";
import { JobStatus } from "@prisma/client";
import {
  createMockSession,
  createAuthTestSuite,
  expectSuccessResponse,
  expectErrorResponse,
  parseJsonResponse,
  type AuthTestConfig,
} from "../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../utils/mocks";

type ReportJobsErrorResponse = { error: string; provided: string };
type ReportJobsSuccessResponse = {
  reports: unknown[];
  totalCount: number;
  page: number;
  pageSize: number;
};

describe("/api/reportJobs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/reportJobs", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/reportJobs",
        requiredPrivilege: "Authenticated",
        mockRequest: () =>
          new NextRequest("http://localhost:3000/api/reportJobs"),
      };

      const setupMocks = () => {
        prismaMock.report.count.mockResolvedValue(0);
        prismaMock.report.findMany.mockResolvedValue([]);
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

    it("should return report jobs for authenticated user", async () => {
      const mockSession = createMockSession();
      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.report.count.mockResolvedValue(0);
      prismaMock.report.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/reportJobs",
      );

      const response = await GET(request);

      await expectSuccessResponse(response, {
        reports: [],
        totalCount: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });
      expect(prismaMock.report.findMany).toHaveBeenCalled();
    });

    describe("Status filtering", () => {
      it("should filter by status=COMPLETED", async () => {
        mockAuthSession(createMockSession({ user: { id: "u1" } }));
        mockHasPermission(true);
        prismaMock.report.count.mockResolvedValue(0);
        prismaMock.report.findMany.mockResolvedValue([]);

        const request = new NextRequest(
          "http://localhost:3000/api/reportJobs?status=COMPLETED",
        );
        await GET(request);

        expect(prismaMock.report.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: JobStatus.COMPLETED,
              generatedById: "u1",
              deleted: false,
            }),
          }),
        );
      });

      it("should filter by multiple statuses", async () => {
        mockAuthSession(createMockSession({ user: { id: "u1" } }));
        mockHasPermission(true);
        prismaMock.report.count.mockResolvedValue(0);
        prismaMock.report.findMany.mockResolvedValue([]);

        const request = new NextRequest(
          "http://localhost:3000/api/reportJobs?status=COMPLETED,FAILED",
        );
        await GET(request);

        expect(prismaMock.report.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: { in: [JobStatus.COMPLETED, JobStatus.FAILED] },
            }),
          }),
        );
      });

      it("should not filter by status when status=all", async () => {
        mockAuthSession(createMockSession({ user: { id: "u1" } }));
        mockHasPermission(true);
        prismaMock.report.count.mockResolvedValue(5);
        prismaMock.report.findMany.mockResolvedValue([]);

        const request = new NextRequest(
          "http://localhost:3000/api/reportJobs?status=all",
        );
        await GET(request);

        const call = prismaMock.report.findMany.mock.calls[0];
        expect(call[0].where).not.toHaveProperty("status");
      });

      it("should return 400 for invalid status", async () => {
        mockAuthSession(createMockSession());
        mockHasPermission(true);

        const request = new NextRequest(
          "http://localhost:3000/api/reportJobs?status=invalid",
        );
        const response = await GET(request);

        expect(response.status).toBe(400);
        const json =
          await parseJsonResponse<ReportJobsErrorResponse>(response);
        expect(json.error).toContain("Invalid status");
        expect(json.provided).toBe("invalid");
      });
    });

    describe("Pagination", () => {
      it("should apply pagination params", async () => {
        mockAuthSession(createMockSession({ user: { id: "u1" } }));
        mockHasPermission(true);
        prismaMock.report.count.mockResolvedValue(50);
        prismaMock.report.findMany.mockResolvedValue([]);

        const request = new NextRequest(
          "http://localhost:3000/api/reportJobs?page=3&pageSize=20",
        );
        const response = await GET(request);

        await expectSuccessResponse(response, {
          reports: [],
          totalCount: 50,
          page: 3,
          pageSize: 20,
          totalPages: 3,
        });
        expect(prismaMock.report.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 40,
            take: 20,
          }),
        );
      });

      it("should clamp pageSize to max 100", async () => {
        mockAuthSession(createMockSession({ user: { id: "u1" } }));
        mockHasPermission(true);
        prismaMock.report.count.mockResolvedValue(0);
        prismaMock.report.findMany.mockResolvedValue([]);

        const request = new NextRequest(
          "http://localhost:3000/api/reportJobs?pageSize=200",
        );
        const response = await GET(request);

        const json =
          await parseJsonResponse<ReportJobsSuccessResponse>(response);
        expect(json.pageSize).toBe(100);
      });

      it("should clamp page to maxPage when exceeding total", async () => {
        mockAuthSession(createMockSession({ user: { id: "u1" } }));
        mockHasPermission(true);
        prismaMock.report.count.mockResolvedValue(5);
        prismaMock.report.findMany.mockResolvedValue([]);

        const request = new NextRequest(
          "http://localhost:3000/api/reportJobs?page=99999&pageSize=10",
        );
        const response = await GET(request);

        const json =
          await parseJsonResponse<ReportJobsSuccessResponse>(response);
        expect(json.page).toBe(1);
      });
    });

    describe("Response shape with data", () => {
      it("should return populated report data", async () => {
        const mockReports = [
          {
            id: "r1",
            title: "Test Report",
            description: null,
            ReportType: "CommitteeReport",
            fileType: "pdf",
            public: false,
            status: JobStatus.COMPLETED,
            requestedAt: new Date("2025-01-01"),
            completedAt: new Date("2025-01-02"),
          },
        ];
        mockAuthSession(createMockSession({ user: { id: "u1" } }));
        mockHasPermission(true);
        prismaMock.report.count.mockResolvedValue(1);
        prismaMock.report.findMany.mockResolvedValue(mockReports as never);

        const request = new NextRequest(
          "http://localhost:3000/api/reportJobs",
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        const json =
          await parseJsonResponse<ReportJobsSuccessResponse>(response);
        expect(json.reports).toHaveLength(1);
        expect(json.reports[0]).toMatchObject({
          id: "r1",
          title: "Test Report",
          status: "COMPLETED",
        });
        expect(json.totalCount).toBe(1);
      });
    });

    describe("Database error handling", () => {
      it("should return 500 when findMany fails", async () => {
        mockAuthSession(createMockSession({ user: { id: "u1" } }));
        mockHasPermission(true);
        prismaMock.report.count.mockResolvedValue(0);
        prismaMock.report.findMany.mockRejectedValue(
          new Error("Database error"),
        );

        const request = new NextRequest(
          "http://localhost:3000/api/reportJobs",
        );
        const response = await GET(request);

        await expectErrorResponse(response, 500, "Internal Server Error");
      });

      it("should return 500 when count fails", async () => {
        mockAuthSession(createMockSession({ user: { id: "u1" } }));
        mockHasPermission(true);
        prismaMock.report.count.mockRejectedValue(
          new Error("Database count error"),
        );
        prismaMock.report.findMany.mockResolvedValue([]);

        const request = new NextRequest(
          "http://localhost:3000/api/reportJobs",
        );
        const response = await GET(request);

        await expectErrorResponse(response, 500, "Internal Server Error");
      });
    });
  });
});
