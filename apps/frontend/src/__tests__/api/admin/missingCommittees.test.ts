import { type NextRequest } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { GET, POST } from "~/app/api/admin/committees/missing/route";
import {
  createMockRequest,
  createMockSession,
  createInsufficientPrivilegeTestCases,
  createUnauthenticatedTestCase,
  runAuthTest,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPrivilege,
  prismaMock,
  rawQueryMock,
} from "../../utils/mocks";

const queryRawMock = rawQueryMock("$queryRaw");

describe("/api/admin/committees/missing authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // The shared generator also emits Developer, which only fails here because
  // hasPrivilegeFor is mocked; Developer outranks Admin, so it is left out.
  const deniedCases = [
    createUnauthenticatedTestCase(),
    ...createInsufficientPrivilegeTestCases(PrivilegeLevel.Admin).filter(
      (testCase) =>
        testCase.session?.user?.privilegeLevel !== PrivilegeLevel.Developer,
    ),
  ];

  it.each(deniedCases)(
    "GET: $description and reads nothing",
    async (testCase) => {
      await runAuthTest(
        testCase,
        GET,
        {} as NextRequest,
        mockAuthSession,
        mockHasPrivilege,
      );
      expect(queryRawMock).not.toHaveBeenCalled();
    },
  );

  it.each(deniedCases)(
    "POST: $description and writes nothing",
    async (testCase) => {
      await runAuthTest(
        testCase,
        POST,
        {} as NextRequest,
        mockAuthSession,
        mockHasPrivilege,
      );
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.committeeList.createMany).not.toHaveBeenCalled();
    },
  );
});

describe("missing-committee preview validation", () => {
  beforeEach(() => {
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPrivilege(true);
  });

  it.each([{}, { termId: "" }, { termId: 42 }])(
    "rejects invalid payload %j",
    async (body) => {
      const response = await POST(createMockRequest(body));
      expect(response.status).toBe(422);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    },
  );

  it("rejects a stale term before reading voters or writing committees", async () => {
    prismaMock.committeeTerm.findFirst.mockResolvedValue({
      id: "new-term",
      label: "New term",
      isActive: true,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2028-01-01"),
      createdAt: new Date("2026-01-01"),
    });
    const response = await POST(createMockRequest({ termId: "old-term" }));
    expect(response.status).toBe(409);
    expect(queryRawMock).not.toHaveBeenCalled();
    expect(prismaMock.committeeList.createMany).not.toHaveBeenCalled();
    expect(prismaMock.seat.createMany).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });
});
