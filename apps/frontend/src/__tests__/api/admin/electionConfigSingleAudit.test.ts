/**
 * Tests for the audit rows written by the single-record election-config routes:
 * POST /api/admin/officeNames and DELETE of both officeNames/[id] and
 * electionDates/[id]. The create/delete behaviour itself is covered elsewhere; these
 * assert the audit trail and its fail-open contract (a failed audit write must not turn
 * a successful edit into an error).
 */
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { PrivilegeLevel } from "@prisma/client";
import { POST as CREATE_OFFICE } from "~/app/api/admin/officeNames/route";
import { DELETE as DELETE_OFFICE } from "~/app/api/admin/officeNames/[id]/route";
import { DELETE as DELETE_DATE } from "~/app/api/admin/electionDates/[id]/route";
import {
  createMockSession,
  createMockRequest,
  expectAuditLogCreate,
  parseJsonResponse,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

const officeNameMock = () =>
  prismaMock.officeName as unknown as {
    findFirst: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };

const electionDateMock = () =>
  prismaMock.electionDate as unknown as { delete: jest.Mock };

const auditMock = () => prismaMock.auditLog.create as jest.Mock;

const routeContext = (id: string) => ({ params: Promise.resolve({ id }) });

const deleteRequest = () =>
  createMockRequest(undefined, {}, { method: "DELETE" });

const asAdmin = () => {
  mockAuthSession(
    createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
  );
  mockHasPermission(true);
};

describe("single-record election-config audit logging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asAdmin();
  });

  describe("POST /api/admin/officeNames", () => {
    const stubCreate = () => {
      officeNameMock().findFirst.mockResolvedValue(null);
      officeNameMock().create.mockResolvedValue({ id: 4, officeName: "Mayor" });
    };

    it("writes an OFFICE_NAME_CREATED audit row", async () => {
      stubCreate();

      const response = await CREATE_OFFICE(
        createMockRequest({ name: "Mayor" }),
      );

      expect(response.status).toBe(201);
      expect(auditMock()).toHaveBeenCalledTimes(1);
      expect(auditMock()).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "OFFICE_NAME_CREATED",
          entityType: "OfficeName",
          entityId: "4",
          afterValue: { id: 4, officeName: "Mayor" },
        }),
      );
    });

    it("still returns 201 when the audit write fails (fail-open)", async () => {
      stubCreate();
      auditMock().mockRejectedValue(new Error("audit down"));

      const response = await CREATE_OFFICE(
        createMockRequest({ name: "Mayor" }),
      );

      expect(response.status).toBe(201);
    });

    it("writes no audit row when the name already exists", async () => {
      officeNameMock().findFirst.mockResolvedValue({
        id: 1,
        officeName: "Mayor",
      });

      const response = await CREATE_OFFICE(
        createMockRequest({ name: "mayor" }),
      );

      expect(response.status).toBe(409);
      expect(auditMock()).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /api/admin/officeNames/[id]", () => {
    it("writes an OFFICE_NAME_DELETED audit row carrying the deleted record", async () => {
      officeNameMock().delete.mockResolvedValue({ id: 4, officeName: "Mayor" });

      const response = await DELETE_OFFICE(deleteRequest(), routeContext("4"));

      expect(response.status).toBe(200);
      expect(auditMock()).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "OFFICE_NAME_DELETED",
          entityType: "OfficeName",
          entityId: "4",
          beforeValue: { id: 4, officeName: "Mayor" },
        }),
      );
    });

    it("still returns 200 when the audit write fails (fail-open)", async () => {
      officeNameMock().delete.mockResolvedValue({ id: 4, officeName: "Mayor" });
      auditMock().mockRejectedValue(new Error("audit down"));

      const response = await DELETE_OFFICE(deleteRequest(), routeContext("4"));

      expect(response.status).toBe(200);
    });

    it("writes no audit row when the delete fails", async () => {
      officeNameMock().delete.mockRejectedValue(new Error("not found"));

      const response = await DELETE_OFFICE(deleteRequest(), routeContext("4"));

      expect(response.status).toBe(500);
      expect(auditMock()).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /api/admin/electionDates/[id]", () => {
    it("writes an ELECTION_DATE_DELETED audit row carrying the deleted record", async () => {
      const date = new Date(Date.UTC(2026, 10, 3));
      electionDateMock().delete.mockResolvedValue({ id: 9, date });

      const response = await DELETE_DATE(deleteRequest(), routeContext("9"));

      expect(response.status).toBe(200);
      const json = await parseJsonResponse<{ id: number }>(response);
      expect(json.id).toBe(9);
      expect(auditMock()).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "ELECTION_DATE_DELETED",
          entityType: "ElectionDate",
          entityId: "9",
          beforeValue: { id: 9, date },
        }),
      );
    });

    it("still returns 200 when the audit write fails (fail-open)", async () => {
      electionDateMock().delete.mockResolvedValue({
        id: 9,
        date: new Date(Date.UTC(2026, 10, 3)),
      });
      auditMock().mockRejectedValue(new Error("audit down"));

      const response = await DELETE_DATE(deleteRequest(), routeContext("9"));

      expect(response.status).toBe(200);
    });

    it("writes no audit row when the delete fails", async () => {
      electionDateMock().delete.mockRejectedValue(new Error("not found"));

      const response = await DELETE_DATE(deleteRequest(), routeContext("9"));

      expect(response.status).toBe(500);
      expect(auditMock()).not.toHaveBeenCalled();
    });
  });
});
