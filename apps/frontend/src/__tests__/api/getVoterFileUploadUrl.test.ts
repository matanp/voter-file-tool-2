/**
 * Tests for POST /api/getVoterFileUploadUrl.
 * Tested: 401/403 auth (Admin only), validation (missing fields, extension, contentType, size),
 * success path, 500 on S3 error.
 */
import { POST } from "~/app/api/getVoterFileUploadUrl/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockRequest,
  createAuthTestSuite,
  expectErrorResponse,
  type AuthTestConfig,
} from "../utils/testUtils";
import { mockAuthSession, mockHasPermission } from "../utils/mocks";

const mockGetPresignedUploadUrl = jest.fn();
jest.mock("~/lib/s3Utils", () => ({
  getPresignedUploadUrl: (...args: unknown[]) =>
    mockGetPresignedUploadUrl(...args),
}));

describe("/api/getVoterFileUploadUrl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPresignedUploadUrl.mockResolvedValue(
      "https://s3.example.com/presigned-upload",
    );
  });

  describe("POST /api/getVoterFileUploadUrl", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/getVoterFileUploadUrl",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () =>
          createMockRequest({
            fileName: "voters.txt",
            fileSize: 1024,
            contentType: "text/plain",
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
        fileName: "voters.txt",
        // missing contentType, fileSize
      });
      const response = await POST(request);

      await expectErrorResponse(
        response,
        400,
        "Missing required fields: fileName, contentType, and fileSize are required",
      );
    });

    it("should return 400 when file does not end with .txt", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      const request = createMockRequest({
        fileName: "voters.csv",
        fileSize: 1024,
        contentType: "text/plain",
      });
      const response = await POST(request);

      await expectErrorResponse(
        response,
        400,
        "Only .txt files are allowed for voter file uploads",
      );
    });

    it("should return 400 for invalid content type", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      const request = createMockRequest({
        fileName: "voters.txt",
        fileSize: 1024,
        contentType: "application/pdf",
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("Invalid content type");
    });

    it("should return 400 when file exceeds 500MB", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      const request = createMockRequest({
        fileName: "voters.txt",
        fileSize: 501 * 1024 * 1024,
        contentType: "text/plain",
      });
      const response = await POST(request);

      await expectErrorResponse(
        response,
        400,
        "File too large (max 500MB)",
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
        fileName: "voters.txt",
        fileSize: 1024,
        contentType: "text/plain",
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.uploadUrl).toBe("https://presigned.example/upload");
      expect(json.fileKey).toMatch(/^voter-file-uploads\/\d+-.+/);
      expect(mockGetPresignedUploadUrl).toHaveBeenCalled();
    });

    it("should return 500 when S3 util throws", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      mockGetPresignedUploadUrl.mockRejectedValue(new Error("S3 error"));

      const request = createMockRequest({
        fileName: "voters.txt",
        fileSize: 1024,
        contentType: "text/plain",
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
