import { POST } from "~/app/api/committee/fetchLoaded/route";
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

describe("/api/committee/fetchLoaded", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/committee/fetchLoaded", () => {
    it("should successfully fetch and process discrepancies with no data", async () => {
      // Arrange
      prismaMock.committeeUploadDiscrepancy.findMany.mockResolvedValue([]);
      prismaMock.voterRecord.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/committee/fetchLoaded",
        {
          method: "POST",
        },
      );

      // Act
      const response = await POST();

      // Assert
      await expectSuccessResponse(
        response,
        {
          success: true,
          message: "Discrepancies fetched and processed successfully",
          discrepanciesMap: [],
          recordsWithDiscrepancies: [],
        },
        200,
      );

      expect(
        prismaMock.committeeUploadDiscrepancy.findMany,
      ).toHaveBeenCalledWith({
        include: { committee: true },
      });
      expect(prismaMock.voterRecord.findMany).toHaveBeenCalledWith({
        where: { OR: [] },
      });
    });

    it("should successfully fetch and process discrepancies with single discrepancy", async () => {
      // Arrange
      const mockDiscrepancy = createMockCommitteeUploadDiscrepancy();
      const mockVoterRecord = createMockVoterRecord();

      prismaMock.committeeUploadDiscrepancy.findMany.mockResolvedValue([
        mockDiscrepancy,
      ]);
      prismaMock.voterRecord.findMany.mockResolvedValue([mockVoterRecord]);

      const request = new NextRequest(
        "http://localhost:3000/api/committee/fetchLoaded",
        {
          method: "POST",
        },
      );

      // Act
      const response = await POST();

      // Assert
      await expectSuccessResponse(
        response,
        {
          success: true,
          message: "Discrepancies fetched and processed successfully",
          discrepanciesMap: [
            [
              "TEST123456",
              {
                discrepancies: {
                  incoming: "New Address",
                  existing: "Old Address",
                },
                committee: {
                  id: 1,
                  cityTown: "Test City",
                  legDistrict: 1,
                  electionDistrict: 1,
                },
              },
            ],
          ],
          recordsWithDiscrepancies: [mockVoterRecord],
        },
        200,
      );

      expect(
        prismaMock.committeeUploadDiscrepancy.findMany,
      ).toHaveBeenCalledWith({
        include: { committee: true },
      });
      expect(prismaMock.voterRecord.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ VRCNUM: "TEST123456" }],
        },
      });
    });

    it("should successfully fetch and process discrepancies with multiple discrepancies", async () => {
      // Arrange
      const mockDiscrepancy1 = createMockCommitteeUploadDiscrepancy({
        VRCNUM: "TEST123456",
        discrepancy: {
          incoming: "New Address 1",
          existing: "Old Address 1",
        },
      });
      const mockDiscrepancy2 = createMockCommitteeUploadDiscrepancy({
        VRCNUM: "TEST789012",
        discrepancy: {
          incoming: "New Address 2",
          existing: "Old Address 2",
        },
        committee: {
          id: 2,
          cityTown: "Another City",
          legDistrict: 2,
          electionDistrict: 2,
        },
      });

      const mockVoterRecord1 = createMockVoterRecord({ VRCNUM: "TEST123456" });
      const mockVoterRecord2 = createMockVoterRecord({ VRCNUM: "TEST789012" });

      prismaMock.committeeUploadDiscrepancy.findMany.mockResolvedValue([
        mockDiscrepancy1,
        mockDiscrepancy2,
      ]);
      prismaMock.voterRecord.findMany.mockResolvedValue([
        mockVoterRecord1,
        mockVoterRecord2,
      ]);

      const request = new NextRequest(
        "http://localhost:3000/api/committee/fetchLoaded",
        {
          method: "POST",
        },
      );

      // Act
      const response = await POST();

      // Assert
      await expectSuccessResponse(
        response,
        {
          success: true,
          message: "Discrepancies fetched and processed successfully",
          discrepanciesMap: [
            [
              "TEST123456",
              {
                discrepancies: {
                  incoming: "New Address 1",
                  existing: "Old Address 1",
                },
                committee: {
                  id: 1,
                  cityTown: "Test City",
                  legDistrict: 1,
                  electionDistrict: 1,
                },
              },
            ],
            [
              "TEST789012",
              {
                discrepancies: {
                  incoming: "New Address 2",
                  existing: "Old Address 2",
                },
                committee: {
                  id: 2,
                  cityTown: "Another City",
                  legDistrict: 2,
                  electionDistrict: 2,
                },
              },
            ],
          ],
          recordsWithDiscrepancies: [mockVoterRecord1, mockVoterRecord2],
        },
        200,
      );

      expect(
        prismaMock.committeeUploadDiscrepancy.findMany,
      ).toHaveBeenCalledWith({
        include: { committee: true },
      });
      expect(prismaMock.voterRecord.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ VRCNUM: "TEST123456" }, { VRCNUM: "TEST789012" }],
        },
      });
    });

    it("should handle discrepancies with missing voter records", async () => {
      // Arrange
      const mockDiscrepancy = createMockCommitteeUploadDiscrepancy();

      prismaMock.committeeUploadDiscrepancy.findMany.mockResolvedValue([
        mockDiscrepancy,
      ]);
      prismaMock.voterRecord.findMany.mockResolvedValue([]); // No voter records found

      const request = new NextRequest(
        "http://localhost:3000/api/committee/fetchLoaded",
        {
          method: "POST",
        },
      );

      // Act
      const response = await POST();

      // Assert
      await expectSuccessResponse(
        response,
        {
          success: true,
          message: "Discrepancies fetched and processed successfully",
          discrepanciesMap: [
            [
              "TEST123456",
              {
                discrepancies: {
                  incoming: "New Address",
                  existing: "Old Address",
                },
                committee: {
                  id: 1,
                  cityTown: "Test City",
                  legDistrict: 1,
                  electionDistrict: 1,
                },
              },
            ],
          ],
          recordsWithDiscrepancies: [],
        },
        200,
      );

      expect(prismaMock.voterRecord.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ VRCNUM: "TEST123456" }],
        },
      });
    });

    it("should return 500 when committeeUploadDiscrepancy.findMany fails", async () => {
      // Arrange
      prismaMock.committeeUploadDiscrepancy.findMany.mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/committee/fetchLoaded",
        {
          method: "POST",
        },
      );

      // Act
      const response = await POST();

      // Assert
      await expectErrorResponse(
        response,
        500,
        "Error processing discrepancies",
      );
    });

    it("should return 500 when voterRecord.findMany fails", async () => {
      // Arrange
      const mockDiscrepancy = createMockCommitteeUploadDiscrepancy();

      prismaMock.committeeUploadDiscrepancy.findMany.mockResolvedValue([
        mockDiscrepancy,
      ]);
      prismaMock.voterRecord.findMany.mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/committee/fetchLoaded",
        {
          method: "POST",
        },
      );

      // Act
      const response = await POST();

      // Assert
      await expectErrorResponse(
        response,
        500,
        "Error processing discrepancies",
      );
    });

    it("should handle complex discrepancy data structure", async () => {
      // Arrange
      const mockDiscrepancy = createMockCommitteeUploadDiscrepancy({
        VRCNUM: "COMPLEX123",
        discrepancy: {
          incoming: "123 New Complex Street, Apt 4B, New York, NY 10001",
          existing: "456 Old Simple Road, New York, NY 10002",
        },
        committee: {
          id: 99,
          cityTown: "Complex City",
          legDistrict: 99,
          electionDistrict: 99,
        },
      });

      const mockVoterRecord = createMockVoterRecord({
        VRCNUM: "COMPLEX123",
        firstName: "Complex",
        lastName: "User",
        street: "456 Old Simple Road",
        city: "New York",
        state: "NY",
        zipCode: "10002",
      });

      prismaMock.committeeUploadDiscrepancy.findMany.mockResolvedValue([
        mockDiscrepancy,
      ]);
      prismaMock.voterRecord.findMany.mockResolvedValue([mockVoterRecord]);

      const request = new NextRequest(
        "http://localhost:3000/api/committee/fetchLoaded",
        {
          method: "POST",
        },
      );

      // Act
      const response = await POST();

      // Assert
      await expectSuccessResponse(
        response,
        {
          success: true,
          message: "Discrepancies fetched and processed successfully",
          discrepanciesMap: [
            [
              "COMPLEX123",
              {
                discrepancies: {
                  incoming:
                    "123 New Complex Street, Apt 4B, New York, NY 10001",
                  existing: "456 Old Simple Road, New York, NY 10002",
                },
                committee: {
                  id: 99,
                  cityTown: "Complex City",
                  legDistrict: 99,
                  electionDistrict: 99,
                },
              },
            ],
          ],
          recordsWithDiscrepancies: [mockVoterRecord],
        },
        200,
      );
    });
  });
});
