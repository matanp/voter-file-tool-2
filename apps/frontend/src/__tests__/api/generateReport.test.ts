/**
 * Tests for POST /api/generateReport.
 * Tested: 401/403 auth, ldCommittees + voterList success, 400 for invalid body,
 * 500 when WEBHOOK_SECRET missing, 500 + FAILED when PDF API fails or returns success=false,
 * 500 when session missing user.id (Gap 1), HMAC/gzip request format (Gap 2).
 */
import { POST } from "~/app/api/generateReport/route";
import { PrivilegeLevel, JobStatus } from "@prisma/client";
import {
  createMockRequest,
  createMockSession,
  createAuthTestSuite,
  expectSuccessResponse,
  mockJsonResponse,
  parseJsonResponse,
  getMockCallArgs,
  type ErrorResponseBody,
  type AuthTestConfig,
} from "../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../utils/mocks";
import { hasPermissionFor } from "~/lib/utils";

const MOCK_REPORT_ID = "cltestreportid123456789";

describe("/api/generateReport", () => {
  const originalEnv = process.env;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, WEBHOOK_SECRET: "test-webhook-secret" };
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ success: true, numJobs: 0 }),
      );
  });

  afterAll(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  });

  describe("POST /api/generateReport", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/generateReport",
        requiredPrivilege: PrivilegeLevel.RequestAccess,
        mockRequest: () =>
          createMockRequest({
            type: "ldCommittees",
            name: "Test Report",
            format: "pdf",
          }),
      };

      const setupMocks = () => {
        prismaMock.report.create.mockResolvedValue({
          id: MOCK_REPORT_ID,
        } as never);
        prismaMock.report.update.mockResolvedValue({} as never);
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

    it("should return reportId and jobsAhead on success", async () => {
      mockAuthSession(
        createMockSession({
          user: { id: "user-1", privilegeLevel: PrivilegeLevel.RequestAccess },
        }),
      );
      mockHasPermission(true);
      prismaMock.report.create.mockResolvedValue({
        id: MOCK_REPORT_ID,
      } as never);
      prismaMock.report.update.mockResolvedValue({} as never);

      const request = createMockRequest({
        type: "ldCommittees",
        name: "Test Report",
        format: "pdf",
      });

      const response = await POST(request);

      await expectSuccessResponse(response, {
        reportId: MOCK_REPORT_ID,
        jobsAhead: 0,
      });
      expect(prismaMock.report.create).toHaveBeenCalled();
      expect(globalThis.fetch).toHaveBeenCalled();
      expect(prismaMock.report.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_REPORT_ID },
          data: expect.objectContaining({
            status: JobStatus.PROCESSING,
          }) as Record<string, unknown>,
        }),
      );
    });

    it("should send gzipped body and x-webhook-signature header to PDF API", async () => {
      mockAuthSession(
        createMockSession({
          user: { id: "user-1", privilegeLevel: PrivilegeLevel.RequestAccess },
        }),
      );
      mockHasPermission(true);
      prismaMock.report.create.mockResolvedValue({
        id: MOCK_REPORT_ID,
      } as never);
      prismaMock.report.update.mockResolvedValue({} as never);

      const request = createMockRequest({
        type: "ldCommittees",
        name: "Test Report",
        format: "pdf",
      });

      await POST(request);

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const fetchArgs = getMockCallArgs(globalThis.fetch as jest.Mock);
      const fetchOptions = fetchArgs[1] as RequestInit | undefined;

      const headers = fetchOptions?.headers as Record<string, string> | undefined;
      const signature = headers?.["x-webhook-signature"];
      expect(signature).toBeTruthy();
      expect(typeof signature).toBe("string");
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);

      const body = fetchOptions?.body;
      expect(body).toBeDefined();
      expect(body).toBeInstanceOf(Uint8Array);
      const bytes = body as Uint8Array;
      expect(bytes.length).toBeGreaterThan(0);
      expect(bytes[0]).toBe(0x1f);
      expect(bytes[1]).toBe(0x8b);
    });

    it("should succeed with absenteeReport type", async () => {
      mockAuthSession(
        createMockSession({
          user: { id: "user-1", privilegeLevel: PrivilegeLevel.RequestAccess },
        }),
      );
      mockHasPermission(true);
      prismaMock.report.create.mockResolvedValue({
        id: MOCK_REPORT_ID,
      } as never);
      prismaMock.report.update.mockResolvedValue({} as never);

      const request = createMockRequest({
        type: "absenteeReport",
        name: "Absentee Report",
        format: "xlsx",
        csvFileKey: "csv-uploads/12345-data.csv",
      });

      const response = await POST(request);

      await expectSuccessResponse(response, {
        reportId: MOCK_REPORT_ID,
        jobsAhead: 0,
      });
    });

    it("should return 403 when Leader requests countywide vacancy report", async () => {
      mockAuthSession(
        createMockSession({
          user: { id: "user-1", privilegeLevel: PrivilegeLevel.Leader },
        }),
      );
      jest.mocked(hasPermissionFor).mockImplementation(
        (_principal, required) => required !== PrivilegeLevel.Admin,
      );

      const request = createMockRequest({
        type: "vacancyReport",
        name: "Vacancy Report",
        format: "xlsx",
        scope: "countywide",
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
      const json = await parseJsonResponse<ErrorResponseBody>(response);
      expect(json.error).toContain("countywide");
      expect(prismaMock.report.create).not.toHaveBeenCalled();
    });

    it("should succeed with designationWeightSummary type (Admin, countywide)", async () => {
      mockAuthSession(
        createMockSession({
          user: { id: "user-1", privilegeLevel: PrivilegeLevel.Admin },
        }),
      );
      mockHasPermission(true);
      prismaMock.report.create.mockResolvedValue({
        id: MOCK_REPORT_ID,
      } as never);
      prismaMock.report.update.mockResolvedValue({} as never);

      const request = createMockRequest({
        type: "designationWeightSummary",
        name: "Weight Summary",
        format: "xlsx",
        scope: "countywide",
      });

      const response = await POST(request);

      await expectSuccessResponse(response, {
        reportId: MOCK_REPORT_ID,
        jobsAhead: 0,
      });
    });

    it("should return 403 when Leader requests designationWeightSummary with countywide scope", async () => {
      mockAuthSession(
        createMockSession({
          user: { id: "user-1", privilegeLevel: PrivilegeLevel.Leader },
        }),
      );
      jest.mocked(hasPermissionFor).mockImplementation(
        (_principal, required) => required !== PrivilegeLevel.Admin,
      );

      const request = createMockRequest({
        type: "designationWeightSummary",
        name: "Weight Summary",
        format: "xlsx",
        scope: "countywide",
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
      const json = await parseJsonResponse<ErrorResponseBody>(response);
      expect(json.error).toContain("cannot generate countywide");
    });

    it("should succeed with vacancyReport type when Admin", async () => {
      mockAuthSession(
        createMockSession({
          user: { id: "user-1", privilegeLevel: PrivilegeLevel.Admin },
        }),
      );
      mockHasPermission(true);
      prismaMock.report.create.mockResolvedValue({
        id: MOCK_REPORT_ID,
      } as never);
      prismaMock.report.update.mockResolvedValue({} as never);

      const request = createMockRequest({
        type: "vacancyReport",
        name: "Vacancy Report",
        format: "xlsx",
        scope: "countywide",
      });

      const response = await POST(request);

      await expectSuccessResponse(response, {
        reportId: MOCK_REPORT_ID,
        jobsAhead: 0,
      });
    });

    it("should return 500 and mark FAILED when PDF API returns ok but success=false", async () => {
      mockAuthSession(
        createMockSession({
          user: { id: "user-1", privilegeLevel: PrivilegeLevel.RequestAccess },
        }),
      );
      mockHasPermission(true);
      prismaMock.report.create.mockResolvedValue({
        id: MOCK_REPORT_ID,
      } as never);
      prismaMock.report.update.mockResolvedValue({} as never);
      globalThis.fetch = jest
        .fn()
        .mockResolvedValue(
          mockJsonResponse({ success: false, message: "Queue full" }),
        );

      const request = createMockRequest({
        type: "ldCommittees",
        name: "Test Report",
        format: "pdf",
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(prismaMock.report.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_REPORT_ID },
          data: expect.objectContaining({
            status: JobStatus.FAILED,
          }) as Record<string, unknown>,
        }),
      );
    });

    it("should return 400 for invalid request body", async () => {
      mockAuthSession(
        createMockSession({
          user: { id: "1", privilegeLevel: PrivilegeLevel.RequestAccess },
        }),
      );
      mockHasPermission(true);

      const request = createMockRequest({
        type: "invalidType",
        name: "Test",
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await parseJsonResponse<ErrorResponseBody>(response);
      expect(json.error).toBe("Validation failed");
    });

    it("should return 401 when session.user.id is falsy, create no report, and not call PDF API", async () => {
      mockAuthSession(
        createMockSession({
          user: { id: "", privilegeLevel: PrivilegeLevel.RequestAccess },
        }),
      );
      mockHasPermission(true);

      const request = createMockRequest({
        type: "ldCommittees",
        name: "Test Report",
        format: "pdf",
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(prismaMock.report.create).not.toHaveBeenCalled();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("should return 500 when WEBHOOK_SECRET is not set", async () => {
      const savedSecret = process.env.WEBHOOK_SECRET;
      delete process.env.WEBHOOK_SECRET;

      try {
        mockAuthSession(
          createMockSession({
            user: { id: "user-1", privilegeLevel: PrivilegeLevel.RequestAccess },
          }),
        );
        mockHasPermission(true);
        prismaMock.report.create.mockResolvedValue({
          id: MOCK_REPORT_ID,
        } as never);
        prismaMock.report.update.mockResolvedValue({} as never);

        const request = createMockRequest({
          type: "ldCommittees",
          name: "Test Report",
          format: "pdf",
        });

        const response = await POST(request);

        expect(response.status).toBe(500);
        const json = await parseJsonResponse<ErrorResponseBody>(response);
        expect(json.error).toBe("Internal Server Error");
      } finally {
        process.env.WEBHOOK_SECRET = savedSecret;
      }
    });

    it("should return 500 and mark report FAILED when PDF API fails", async () => {
      mockAuthSession(
        createMockSession({
          user: { id: "user-1", privilegeLevel: PrivilegeLevel.RequestAccess },
        }),
      );
      mockHasPermission(true);
      prismaMock.report.create.mockResolvedValue({
        id: MOCK_REPORT_ID,
      } as never);
      prismaMock.report.update.mockResolvedValue({} as never);
      globalThis.fetch = jest
        .fn()
        .mockResolvedValue(
          mockJsonResponse(
            { success: false, message: "Error" },
            { status: 500 },
          ),
        );

      const request = createMockRequest({
        type: "ldCommittees",
        name: "Test Report",
        format: "pdf",
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(prismaMock.report.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_REPORT_ID },
          data: expect.objectContaining({
            status: JobStatus.FAILED,
          }) as Record<string, unknown>,
        }),
      );
    });
  });
});
