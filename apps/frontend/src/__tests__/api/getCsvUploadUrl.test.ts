/**
 * Tests for POST /api/getCsvUploadUrl.
 * Tested: 401/403 auth (Admin only), validation (missing fields, extension, contentType, size),
 * success path, 500 on S3 error.
 */
import { POST } from "~/app/api/getCsvUploadUrl/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockRequest,
  createAuthTestSuite,
  expectErrorResponse,
  parseJsonResponse,
  type ErrorResponseBody,
  type AuthTestConfig,
} from "../utils/testUtils";
import { mockAuthSession, mockHasPermission } from "../utils/mocks";

type CsvUploadSuccessResponse = { uploadUrl: string; fileKey: string };

const mockGetPresignedUploadUrl = jest.fn();
jest.mock("~/lib/s3Utils", () => ({
  getPresignedUploadUrl: (...args: unknown[]): Promise<string> =>
    mockGetPresignedUploadUrl(...args) as Promise<string>,
}));

describe("/api/getCsvUploadUrl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPresignedUploadUrl.mockResolvedValue(
      "https://s3.example.com/presigned-upload",
    );
  });

  describe("POST /api/getCsvUploadUrl", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/getCsvUploadUrl",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () =>
          createMockRequest({
            fileName: "data.csv",
            fileSize: 1024,
            contentType: "text/csv",
          }),
      };

      const setupMocks = () => {
        mockGetPresignedUploadUrl.mockResolvedValue(
          "https://presigned.example/upload",
        );
      };

      const authTestSuite = createAuthTestSuite(
        authConfig,
        POST,
        mockAuthSession,
        mockHasPermission,
        setupMocks,
      );

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });

    it("should return 400 when required fields missing", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      const request = createMockRequest({
        fileName: "data.csv",
      });
      const response = await POST(request);

      await expectErrorResponse(
        response,
        400,
        "Missing required fields: fileName, contentType, and fileSize are required",
      );
    });

    it("should return 400 when file does not end with .csv", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      const request = createMockRequest({
        fileName: "data.txt",
        fileSize: 1024,
        contentType: "text/csv",
      });
      const response = await POST(request);

      await expectErrorResponse(
        response,
        400,
        "Only CSV files are allowed",
      );
    });

    it("should return 400 for invalid content type", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      const request = createMockRequest({
        fileName: "data.csv",
        fileSize: 1024,
        contentType: "application/pdf",
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await parseJsonResponse<ErrorResponseBody>(response);
      expect(json.error).toContain("Invalid content type");
    });

    it("should return 400 when file exceeds 50MB", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      const request = createMockRequest({
        fileName: "data.csv",
        fileSize: 51 * 1024 * 1024,
        contentType: "text/csv",
      });
      const response = await POST(request);

      await expectErrorResponse(
        response,
        400,
        "File too large (max 50MB)",
      );
    });

    it("should return uploadUrl and fileKey on success", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      mockGetPresignedUploadUrl.mockResolvedValue(
        "https://presigned.example/upload",
      );

      const request = createMockRequest({
        fileName: "data.csv",
        fileSize: 1024,
        contentType: "text/csv",
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const json =
        await parseJsonResponse<CsvUploadSuccessResponse>(response);
      expect(json.uploadUrl).toBe("https://presigned.example/upload");
      expect(json.fileKey).toMatch(/^csv-uploads\/\d+-.+/);
      expect(mockGetPresignedUploadUrl).toHaveBeenCalled();
    });

    it("should sanitize path traversal characters in fileName", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      mockGetPresignedUploadUrl.mockResolvedValue(
        "https://presigned.example/upload",
      );

      const request = createMockRequest({
        fileName: "../../etc/passwd.csv",
        fileSize: 1024,
        contentType: "text/csv",
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const json =
        await parseJsonResponse<CsvUploadSuccessResponse>(response);
      // sanitizeForS3Key replaces slashes with hyphens and strips special chars
      expect(json.fileKey).not.toContain("..");
      expect(json.fileKey).not.toContain("/etc/");
      expect(json.fileKey).toMatch(/^csv-uploads\//);
    });

    it("should return 500 when S3 util throws", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      mockGetPresignedUploadUrl.mockRejectedValue(new Error("S3 error"));

      const request = createMockRequest({
        fileName: "data.csv",
        fileSize: 1024,
        contentType: "text/csv",
      });
      const response = await POST(request);

      await expectErrorResponse(
        response,
        500,
        "Failed to generate upload URL",
      );
    });
  });
});
