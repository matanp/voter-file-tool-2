/**
 * SRS 2.6 — API tests for GET /api/admin/petition-outcomes.
 */

import { GET } from "~/app/api/admin/petition-outcomes/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockRequest,
  getMembershipMock,
  objectContainingMatcher,
} from "../../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../../utils/mocks";

describe("GET /api/admin/petition-outcomes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPermission(true);
    getMembershipMock(prismaMock).findMany.mockResolvedValue([]);
  });

  it("returns 200 and array when no outcomes", async () => {
    const req = createMockRequest({}, {}, { method: "GET" });
    const response = await GET(req);

    expect(response.status).toBe(200);
    const json = (await response.json()) as unknown[];
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(0);
  });

  it("filters by termId and committeeListId when provided", async () => {
    getMembershipMock(prismaMock).findMany.mockResolvedValue([]);
    const req = createMockRequest(
      {},
      { termId: "term-1", committeeListId: "2" },
      { method: "GET" },
    );
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(getMembershipMock(prismaMock).findMany).toHaveBeenCalledWith(
      objectContainingMatcher({
        where: objectContainingMatcher({
          termId: "term-1",
          committeeListId: 2,
        }),
      }),
    );
  });
});
