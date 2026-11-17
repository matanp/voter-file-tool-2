import { type NextRequest } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { GET, POST } from "~/app/api/admin/committees/missing/route";
import {
  createInsufficientPrivilegeTestCases,
  createUnauthenticatedTestCase,
  runAuthTest,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
  rawQueryMock,
} from "../../utils/mocks";

const queryRawMock = rawQueryMock("$queryRaw");

describe("/api/admin/committees/missing authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // The shared generator also emits Developer, which only fails here because
  // hasPermissionFor is mocked; Developer outranks Admin, so it is left out.
  const deniedCases = [
    createUnauthenticatedTestCase(),
    ...createInsufficientPrivilegeTestCases(PrivilegeLevel.Admin).filter(
      (testCase) =>
        testCase.session?.user?.privilegeLevel !== PrivilegeLevel.Developer,
    ),
  ];

  it.each(deniedCases)("GET: $description and reads nothing", async (testCase) => {
    await runAuthTest(
      testCase,
      GET,
      {} as NextRequest,
      mockAuthSession,
      mockHasPermission,
    );
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it.each(deniedCases)("POST: $description and writes nothing", async (testCase) => {
    await runAuthTest(
      testCase,
      POST,
      {} as NextRequest,
      mockAuthSession,
      mockHasPermission,
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.committeeList.createMany).not.toHaveBeenCalled();
  });
});
