/**
 * Tests for GET /api/reports.
 * Tested: 401/403 auth, basic success, type filtering (public/my-reports/all),
 * pagination, S3 error handling, DB error handling.
 */
import { GET } from "~/app/api/reports/route";
import { NextRequest } from "next/server";
import { JobStatus, PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createAuthTestSuite,
  expectSuccessResponse,
  expectErrorResponse,
  parseJsonResponse,
  type AuthTestConfig,
} from "../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../utils/mocks";

type ReportsListResponse = {
  reports: Array<{
    presignedUrl: string | null;
    fileSize: number | null;
    fileContentType: string | null;
  }>;
};

const mockGetPresignedReadUrl = jest.fn();
const mockGetFileMetadata = jest.fn();
jest.mock("~/lib/s3Utils", () => ({
  getPresignedReadUrl: (...args: unknown[]) =>
    mockGetPresignedReadUrl(...args),
  getFileMetadata: (...args: unknown[]) => mockGetFileMetadata(...args),
}));

describe("/api/reports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPresignedReadUrl.mockResolvedValue("https://presigned.example/read");
    mockGetFileMetadata.mockResolvedValue({
      size: 1024,
      contentType: "application/pdf",
    });
  });

  describe("GET /api/reports", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/reports",
        requiredPrivilege: "Authenticated",
        mockRequest: () => new NextRequest("http://localhost:3000/api/reports"),
      };

      const setupMocks = () => {
        prismaMock.report.findMany.mockResolvedValue([]);
        prismaMock.report.count.mockResolvedValue(0);
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

    it("should return reports for authenticated user", async () => {
      const mockSession = createMockSession();
      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.report.findMany.mockResolvedValue([]);
      prismaMock.report.count.mockResolvedValue(0);

      const request = new NextRequest("http://localhost:3000/api/reports");

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

    describe("Type filtering", () => {
      it("should filter by type=public", async () => {
        mockAuthSession(createMockSession());
        mockHasPermission(true);
        prismaMock.report.findMany.mockResolvedValue([]);
        prismaMock.report.count.mockResolvedValue(0);

        const request = new NextRequest(
          "http://localhost:3000/api/reports?type=public",
        );
        await GET(request);

        expect(prismaMock.report.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ public: true, deleted: false }),
          }),
        );
      });

      it("should filter by type=my-reports with generatedById and COMPLETED", async () => {
        const mockSession = createMockSession({ user: { id: "user-123" } });
        mockAuthSession(mockSession);
        mockHasPermission(true);
        prismaMock.report.findMany.mockResolvedValue([]);
        prismaMock.report.count.mockResolvedValue(0);

        const request = new NextRequest(
          "http://localhost:3000/api/reports?type=my-reports",
        );
        await GET(request);

        expect(prismaMock.report.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              generatedById: "user-123",
              status: JobStatus.COMPLETED,
              deleted: false,
            }),
          }),
        );
      });

      it("should use type=all for Admin (no extra filters)", async () => {
        const mockSession = createMockSession({
          user: { id: "admin-1", privilegeLevel: PrivilegeLevel.Admin },
        });
        mockAuthSession(mockSession);
        mockHasPermission(true);
        prismaMock.report.findMany.mockResolvedValue([]);
        prismaMock.report.count.mockResolvedValue(0);

        const request = new NextRequest(
          "http://localhost:3000/api/reports?type=all",
        );
        await GET(request);

        expect(prismaMock.report.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { deleted: false },
          }),
        );
      });

      it("should fall back to my-reports when non-admin requests type=all", async () => {
        mockAuthSession(createMockSession({ user: { id: "user-456" } }));
        mockHasPermission(false); // not admin
        prismaMock.report.findMany.mockResolvedValue([]);
        prismaMock.report.count.mockResolvedValue(0);

        const request = new NextRequest(
          "http://localhost:3000/api/reports?type=all",
        );
        await GET(request);

        expect(prismaMock.report.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              generatedById: "user-456",
              status: JobStatus.COMPLETED,
            }),
          }),
        );
      });
    });

    describe("Pagination", () => {
      it("should apply pagination params", async () => {
        mockAuthSession(createMockSession());
        mockHasPermission(true);
        prismaMock.report.findMany.mockResolvedValue([]);
        prismaMock.report.count.mockResolvedValue(42);

        const request = new NextRequest(
          "http://localhost:3000/api/reports?page=2&pageSize=5",
        );
        const response = await GET(request);

        await expectSuccessResponse(response, {
          reports: [],
          totalCount: 42,
          page: 2,
          pageSize: 5,
          totalPages: 9,
        });
        expect(prismaMock.report.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 5,
            take: 5,
          }),
        );
      });

      it("should clamp invalid page/pageSize", async () => {
        mockAuthSession(createMockSession());
        mockHasPermission(true);
        prismaMock.report.findMany.mockResolvedValue([]);
        prismaMock.report.count.mockResolvedValue(0);

        const request = new NextRequest(
          "http://localhost:3000/api/reports?page=foo&pageSize=-1",
        );
        const response = await GET(request);

        // page=foo -> NaN -> 1; pageSize=-1 -> Math.max(1,-1) -> 1
        await expectSuccessResponse(response, {
          reports: [],
          totalCount: 0,
          page: 1,
          pageSize: 1,
          totalPages: 0,
        });
      });
    });

    describe("S3 presigned URL handling", () => {
      it("should populate presignedUrl and file metadata when S3 succeeds", async () => {
        const mockReport = {
          id: "r1",
          title: "Report 1",
          fileKey: "reports/r1.pdf",
          generatedBy: { id: "u1", name: "User", email: "u@e.com" },
        };
        mockAuthSession(createMockSession());
        mockHasPermission(true);
        prismaMock.report.findMany.mockResolvedValue([mockReport]);
        prismaMock.report.count.mockResolvedValue(1);

        const request = new NextRequest("http://localhost:3000/api/reports");
        const response = await GET(request);

        expect(response.status).toBe(200);
        const json = await parseJsonResponse<ReportsListResponse>(response);
        expect(json.reports).toHaveLength(1);
        expect(json.reports[0]).toMatchObject({
          presignedUrl: "https://presigned.example/read",
          fileSize: 1024,
          fileContentType: "application/pdf",
        });
        expect(mockGetPresignedReadUrl).toHaveBeenCalledWith("reports/r1.pdf");
        expect(mockGetFileMetadata).toHaveBeenCalledWith("reports/r1.pdf");
      });

      it("should return null presigned fields when fileKey is null", async () => {
        const mockReport = {
          id: "r2",
          title: "Report 2",
          fileKey: null,
          generatedBy: { id: "u1", name: "User", email: "u@e.com" },
        };
        mockAuthSession(createMockSession());
        mockHasPermission(true);
        prismaMock.report.findMany.mockResolvedValue([mockReport]);
        prismaMock.report.count.mockResolvedValue(1);

        const request = new NextRequest("http://localhost:3000/api/reports");
        const response = await GET(request);

        expect(response.status).toBe(200);
        const json = await parseJsonResponse<ReportsListResponse>(response);
        expect(json.reports[0]).toMatchObject({
          presignedUrl: null,
          fileSize: null,
          fileContentType: null,
        });
        expect(mockGetPresignedReadUrl).not.toHaveBeenCalled();
        expect(mockGetFileMetadata).not.toHaveBeenCalled();
      });

      it("should return report with null presignedUrl when S3 fails", async () => {
        const mockReport = {
          id: "r1",
          title: "Report 1",
          fileKey: "reports/r1.pdf",
          generatedBy: { id: "u1", name: "User", email: "u@e.com" },
        };
        mockAuthSession(createMockSession());
        mockHasPermission(true);
        prismaMock.report.findMany.mockResolvedValue([mockReport]);
        prismaMock.report.count.mockResolvedValue(1);
        mockGetPresignedReadUrl.mockRejectedValue(new Error("S3 error"));
        mockGetFileMetadata.mockRejectedValue(new Error("S3 error"));

        const request = new NextRequest("http://localhost:3000/api/reports");
        const response = await GET(request);

        expect(response.status).toBe(200);
        const json = await parseJsonResponse<ReportsListResponse>(response);
        expect(json.reports).toHaveLength(1);
        expect(json.reports[0]).toMatchObject({
          presignedUrl: null,
          fileSize: null,
          fileContentType: null,
        });
      });
    });

    describe("Database error handling", () => {
      it("should return 500 when findMany fails", async () => {
        mockAuthSession(createMockSession());
        mockHasPermission(true);
        prismaMock.report.findMany.mockRejectedValue(
          new Error("Database connection failed"),
        );
        prismaMock.report.count.mockResolvedValue(0);

        const request = new NextRequest("http://localhost:3000/api/reports");
        const response = await GET(request);

        await expectErrorResponse(response, 500, "Internal Server Error");
      });

      it("should return 500 when count fails", async () => {
        mockAuthSession(createMockSession());
        mockHasPermission(true);
        prismaMock.report.findMany.mockResolvedValue([]);
        prismaMock.report.count.mockRejectedValue(
          new Error("Database count failed"),
        );

        const request = new NextRequest("http://localhost:3000/api/reports");
        const response = await GET(request);

        await expectErrorResponse(response, 500, "Internal Server Error");
      });
    });
  });
});
