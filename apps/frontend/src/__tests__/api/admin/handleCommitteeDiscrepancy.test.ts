import { POST } from "~/app/api/admin/handleCommitteeDiscrepancy/route";
import { NextRequest } from "next/server";
import { prismaMock } from "../../utils/mocks";
import {
  expectSuccessResponse,
  expectErrorResponse,
  createMockVoterRecord,
} from "../../utils/testUtils";

// Mock committee upload discrepancy data
const createMockCommitteeUploadDiscrepancy = (overrides = {}) => ({
  id: "discrepancy-123",
  VRCNUM: "TEST123456",
  committeeId: 1,
  discrepancy: {
    incoming: "New Address",
    existing: "Old Address",
  },
  committee: {
    id: 1,
    cityTown: "Test City",
    legDistrict: 1,
    electionDistrict: 1,
  },
  ...overrides,
});

describe("/api/admin/handleCommitteeDiscrepancy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/admin/handleCommitteeDiscrepancy", () => {
    describe("Validation tests", () => {
      it("should return 400 for missing VRCNUM", async () => {
        // Arrange
        const request = new NextRequest(
          "http://localhost:3000/api/admin/handleCommitteeDiscrepancy",
          {
            method: "POST",
            body: JSON.stringify({
              accept: true,
              takeAddress: "123 New Address",
            }),
          },
        );

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 400, "Invalid request");
      });

      it("should return 400 for empty VRCNUM", async () => {
        // Arrange
        const request = new NextRequest(
          "http://localhost:3000/api/admin/handleCommitteeDiscrepancy",
          {
            method: "POST",
            body: JSON.stringify({
              VRCNUM: "",
              accept: true,
              takeAddress: "123 New Address",
            }),
          },
        );

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 400, "Invalid request");
      });

      it("should return 400 for null VRCNUM", async () => {
        // Arrange
        const request = new NextRequest(
          "http://localhost:3000/api/admin/handleCommitteeDiscrepancy",
          {
            method: "POST",
            body: JSON.stringify({
              VRCNUM: null,
              accept: true,
              takeAddress: "123 New Address",
            }),
          },
        );

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 400, "Invalid request");
      });
    });

    describe("Business logic tests", () => {
      it("should return 404 when discrepancy not found", async () => {
        // Arrange
        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
          null,
        );

        const request = new NextRequest(
          "http://localhost:3000/api/admin/handleCommitteeDiscrepancy",
          {
            method: "POST",
            body: JSON.stringify({
              VRCNUM: "NOTFOUND123",
              accept: true,
              takeAddress: "123 New Address",
            }),
          },
        );

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 404, "Discrepancy not found");
        expect(
          prismaMock.committeeUploadDiscrepancy.findUnique,
        ).toHaveBeenCalledWith({
          where: { VRCNUM: "NOTFOUND123" },
          include: { committee: true },
        });
      });

      it("should successfully handle discrepancy with accept=true and takeAddress", async () => {
        // Arrange
        const mockDiscrepancy = createMockCommitteeUploadDiscrepancy();
        const mockVoterRecord = createMockVoterRecord();

        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
          mockDiscrepancy,
        );
        prismaMock.committeeList.update.mockResolvedValue({
          id: 1,
          cityTown: "Test City",
          legDistrict: 1,
          electionDistrict: 1,
        });
        prismaMock.voterRecord.update.mockResolvedValue(mockVoterRecord);
        prismaMock.committeeUploadDiscrepancy.delete.mockResolvedValue({
          id: "discrepancy-123",
          VRCNUM: "TEST123456",
          committeeId: 1,
          discrepancy: {},
        });

        const request = new NextRequest(
          "http://localhost:3000/api/admin/handleCommitteeDiscrepancy",
          {
            method: "POST",
            body: JSON.stringify({
              VRCNUM: "TEST123456",
              accept: true,
              takeAddress: "123 New Address",
            }),
          },
        );

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(
          response,
          {
            success: true,
            message: "Discrepancy handled successfully",
            committee: {
              id: 1,
              cityTown: "Test City",
              legDistrict: 1,
              electionDistrict: 1,
            },
          },
          200,
        );

        expect(prismaMock.committeeList.update).toHaveBeenCalledWith({
          where: {
            cityTown_legDistrict_electionDistrict: {
              cityTown: "Test City",
              legDistrict: 1,
              electionDistrict: 1,
            },
          },
          data: {
            committeeMemberList: {
              connect: { VRCNUM: "TEST123456" },
            },
          },
        });

        expect(prismaMock.voterRecord.update).toHaveBeenCalledWith({
          where: { VRCNUM: "TEST123456" },
          data: { addressForCommittee: "123 New Address" },
        });

        expect(
          prismaMock.committeeUploadDiscrepancy.delete,
        ).toHaveBeenCalledWith({
          where: { VRCNUM: "TEST123456" },
        });
      });

      it("should successfully handle discrepancy with accept=true and no takeAddress", async () => {
        // Arrange
        const mockDiscrepancy = createMockCommitteeUploadDiscrepancy();

        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
          mockDiscrepancy,
        );
        prismaMock.committeeList.update.mockResolvedValue({
          id: 1,
          cityTown: "Test City",
          legDistrict: 1,
          electionDistrict: 1,
        });
        prismaMock.committeeUploadDiscrepancy.delete.mockResolvedValue({
          id: "discrepancy-123",
          VRCNUM: "TEST123456",
          committeeId: 1,
          discrepancy: {},
        });

        const request = new NextRequest(
          "http://localhost:3000/api/admin/handleCommitteeDiscrepancy",
          {
            method: "POST",
            body: JSON.stringify({
              VRCNUM: "TEST123456",
              accept: true,
              takeAddress: "",
            }),
          },
        );

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(
          response,
          {
            success: true,
            message: "Discrepancy handled successfully",
            committee: {
              id: 1,
              cityTown: "Test City",
              legDistrict: 1,
              electionDistrict: 1,
            },
          },
          200,
        );

        expect(prismaMock.committeeList.update).toHaveBeenCalledWith({
          where: {
            cityTown_legDistrict_electionDistrict: {
              cityTown: "Test City",
              legDistrict: 1,
              electionDistrict: 1,
            },
          },
          data: {
            committeeMemberList: {
              connect: { VRCNUM: "TEST123456" },
            },
          },
        });

        expect(prismaMock.voterRecord.update).not.toHaveBeenCalled();
        expect(
          prismaMock.committeeUploadDiscrepancy.delete,
        ).toHaveBeenCalledWith({
          where: { VRCNUM: "TEST123456" },
        });
      });

      it("should successfully handle discrepancy with accept=false", async () => {
        // Arrange
        const mockDiscrepancy = createMockCommitteeUploadDiscrepancy();

        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
          mockDiscrepancy,
        );
        prismaMock.committeeUploadDiscrepancy.delete.mockResolvedValue({
          id: "discrepancy-123",
          VRCNUM: "TEST123456",
          committeeId: 1,
          discrepancy: {},
        });

        const request = new NextRequest(
          "http://localhost:3000/api/admin/handleCommitteeDiscrepancy",
          {
            method: "POST",
            body: JSON.stringify({
              VRCNUM: "TEST123456",
              accept: false,
              takeAddress: "123 New Address",
            }),
          },
        );

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(
          response,
          {
            success: true,
            message: "Discrepancy handled successfully",
            committee: {
              id: 1,
              cityTown: "Test City",
              legDistrict: 1,
              electionDistrict: 1,
            },
          },
          200,
        );

        expect(prismaMock.committeeList.update).not.toHaveBeenCalled();
        // Note: takeAddress is truthy, so voterRecord.update should be called
        expect(prismaMock.voterRecord.update).toHaveBeenCalledWith({
          where: { VRCNUM: "TEST123456" },
          data: { addressForCommittee: "123 New Address" },
        });
        expect(
          prismaMock.committeeUploadDiscrepancy.delete,
        ).toHaveBeenCalledWith({
          where: { VRCNUM: "TEST123456" },
        });
      });

      it("should handle discrepancy with complex committee data", async () => {
        // Arrange
        const mockDiscrepancy = createMockCommitteeUploadDiscrepancy({
          VRCNUM: "COMPLEX123",
          committee: {
            id: 99,
            cityTown: "Complex City Name",
            legDistrict: 99,
            electionDistrict: 99,
          },
        });

        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
          mockDiscrepancy,
        );
        prismaMock.committeeList.update.mockResolvedValue({
          id: 1,
          cityTown: "Test City",
          legDistrict: 1,
          electionDistrict: 1,
        });
        prismaMock.committeeUploadDiscrepancy.delete.mockResolvedValue({
          id: "discrepancy-123",
          VRCNUM: "TEST123456",
          committeeId: 1,
          discrepancy: {},
        });

        const request = new NextRequest(
          "http://localhost:3000/api/admin/handleCommitteeDiscrepancy",
          {
            method: "POST",
            body: JSON.stringify({
              VRCNUM: "COMPLEX123",
              accept: true,
              takeAddress: "",
            }),
          },
        );

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(
          response,
          {
            success: true,
            message: "Discrepancy handled successfully",
            committee: {
              id: 99,
              cityTown: "Complex City Name",
              legDistrict: 99,
              electionDistrict: 99,
            },
          },
          200,
        );

        expect(prismaMock.committeeList.update).toHaveBeenCalledWith({
          where: {
            cityTown_legDistrict_electionDistrict: {
              cityTown: "Complex City Name",
              legDistrict: 99,
              electionDistrict: 99,
            },
          },
          data: {
            committeeMemberList: {
              connect: { VRCNUM: "COMPLEX123" },
            },
          },
        });
      });
    });

    describe("Error handling tests", () => {
      it("should return 500 when findUnique fails", async () => {
        // Arrange
        prismaMock.committeeUploadDiscrepancy.findUnique.mockRejectedValue(
          new Error("Database error"),
        );

        const request = new NextRequest(
          "http://localhost:3000/api/admin/handleCommitteeDiscrepancy",
          {
            method: "POST",
            body: JSON.stringify({
              VRCNUM: "TEST123456",
              accept: true,
              takeAddress: "123 New Address",
            }),
          },
        );

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 500, "Internal server error");
      });

      it("should return 500 when committeeList.update fails", async () => {
        // Arrange
        const mockDiscrepancy = createMockCommitteeUploadDiscrepancy();

        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
          mockDiscrepancy,
        );
        prismaMock.committeeList.update.mockRejectedValue(
          new Error("Database error"),
        );

        const request = new NextRequest(
          "http://localhost:3000/api/admin/handleCommitteeDiscrepancy",
          {
            method: "POST",
            body: JSON.stringify({
              VRCNUM: "TEST123456",
              accept: true,
              takeAddress: "123 New Address",
            }),
          },
        );

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 500, "Internal server error");
      });

      it("should return 500 when voterRecord.update fails", async () => {
        // Arrange
        const mockDiscrepancy = createMockCommitteeUploadDiscrepancy();

        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
          mockDiscrepancy,
        );
        prismaMock.committeeList.update.mockResolvedValue({
          id: 1,
          cityTown: "Test City",
          legDistrict: 1,
          electionDistrict: 1,
        });
        prismaMock.voterRecord.update.mockRejectedValue(
          new Error("Database error"),
        );

        const request = new NextRequest(
          "http://localhost:3000/api/admin/handleCommitteeDiscrepancy",
          {
            method: "POST",
            body: JSON.stringify({
              VRCNUM: "TEST123456",
              accept: true,
              takeAddress: "123 New Address",
            }),
          },
        );

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 500, "Internal server error");
      });

      it("should return 500 when delete fails", async () => {
        // Arrange
        const mockDiscrepancy = createMockCommitteeUploadDiscrepancy();

        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
          mockDiscrepancy,
        );
        prismaMock.committeeUploadDiscrepancy.delete.mockRejectedValue(
          new Error("Database error"),
        );

        const request = new NextRequest(
          "http://localhost:3000/api/admin/handleCommitteeDiscrepancy",
          {
            method: "POST",
            body: JSON.stringify({
              VRCNUM: "TEST123456",
              accept: false,
              takeAddress: "",
            }),
          },
        );

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 500, "Internal server error");
      });
    });

    describe("Edge cases", () => {
      it("should handle malformed JSON request body", async () => {
        // Arrange
        const request = new NextRequest(
          "http://localhost:3000/api/admin/handleCommitteeDiscrepancy",
          {
            method: "POST",
            body: "invalid json",
          },
        );

        // Act
        const response = await POST(request);

        // Assert
        await expectErrorResponse(response, 400, "Invalid request");
      });

      it("should handle undefined accept parameter", async () => {
        // Arrange
        const mockDiscrepancy = createMockCommitteeUploadDiscrepancy();

        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
          mockDiscrepancy,
        );
        prismaMock.committeeUploadDiscrepancy.delete.mockResolvedValue({
          id: "discrepancy-123",
          VRCNUM: "TEST123456",
          committeeId: 1,
          discrepancy: {},
        });

        const request = new NextRequest(
          "http://localhost:3000/api/admin/handleCommitteeDiscrepancy",
          {
            method: "POST",
            body: JSON.stringify({
              VRCNUM: "TEST123456",
              takeAddress: "123 New Address",
            }),
          },
        );

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(
          response,
          {
            success: true,
            message: "Discrepancy handled successfully",
            committee: {
              id: 1,
              cityTown: "Test City",
              legDistrict: 1,
              electionDistrict: 1,
            },
          },
          200,
        );

        expect(prismaMock.committeeList.update).not.toHaveBeenCalled();
        // Note: takeAddress is truthy, so voterRecord.update should be called
        expect(prismaMock.voterRecord.update).toHaveBeenCalledWith({
          where: { VRCNUM: "TEST123456" },
          data: { addressForCommittee: "123 New Address" },
        });
      });

      it("should handle undefined takeAddress parameter", async () => {
        // Arrange
        const mockDiscrepancy = createMockCommitteeUploadDiscrepancy();

        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
          mockDiscrepancy,
        );
        prismaMock.committeeList.update.mockResolvedValue({
          id: 1,
          cityTown: "Test City",
          legDistrict: 1,
          electionDistrict: 1,
        });
        prismaMock.committeeUploadDiscrepancy.delete.mockResolvedValue({
          id: "discrepancy-123",
          VRCNUM: "TEST123456",
          committeeId: 1,
          discrepancy: {},
        });

        const request = new NextRequest(
          "http://localhost:3000/api/admin/handleCommitteeDiscrepancy",
          {
            method: "POST",
            body: JSON.stringify({
              VRCNUM: "TEST123456",
              accept: true,
            }),
          },
        );

        // Act
        const response = await POST(request);

        // Assert
        await expectSuccessResponse(
          response,
          {
            success: true,
            message: "Discrepancy handled successfully",
            committee: {
              id: 1,
              cityTown: "Test City",
              legDistrict: 1,
              electionDistrict: 1,
            },
          },
          200,
        );

        expect(prismaMock.voterRecord.update).not.toHaveBeenCalled();
      });
    });
  });
});
