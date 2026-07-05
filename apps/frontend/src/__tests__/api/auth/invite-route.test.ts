/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PrivilegeLevel } from "@prisma/client";
import { GET as getInvite } from "~/app/api/auth/invite/[token]/route";
import { POST as applyInvite } from "~/app/api/auth/invite/[token]/apply/route";
import { GET as getPendingInvite } from "~/app/api/auth/invite/pending/route";
import {
  createMockRequest,
  createMockSession,
  DEFAULT_ACTIVE_TERM_ID,
  parseJsonResponse,
} from "../../utils/testUtils";
import { mockAuthSession, prismaMock } from "../../utils/mocks";

const inviteMock = prismaMock.invite as unknown as {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  updateMany: jest.Mock;
};
const userMock = prismaMock.user as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
};
const privilegedUserMock = prismaMock.privilegedUser as unknown as {
  findUnique: jest.Mock;
  upsert: jest.Mock;
};
const userJurisdictionMock = prismaMock.userJurisdiction as unknown as {
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
};
const TOKEN = "invite-token";
const EMAIL = "leader@example.com";
const USER_ID = "user-1";
const INVITE_ID = "invite-1";

function context(token = TOKEN) {
  return { params: Promise.resolve({ token }) };
}

function invite(overrides: Record<string, unknown> = {}) {
  return {
    id: INVITE_ID,
    email: EMAIL,
    token: TOKEN,
    privilegeLevel: PrivilegeLevel.Leader,
    customMessage: null,
    expiresAt: new Date(Date.now() + 86400000),
    usedAt: null,
    createdBy: "admin-1",
    createdAt: new Date(),
    deleted: false,
    deletedAt: null,
    jurisdictions: [
      {
        id: "ij-1",
        inviteId: INVITE_ID,
        cityTown: "Rochester",
        legDistrict: 1,
        termId: DEFAULT_ACTIVE_TERM_ID,
        createdAt: new Date(),
        term: { label: "2024-2026" },
      },
    ],
    ...overrides,
  };
}

describe("GET /api/auth/invite/[token]", () => {
  it("returns invite details without setting a cookie", async () => {
    inviteMock.findUnique.mockResolvedValue(invite());
    userMock.findUnique.mockResolvedValue(null);

    const response = await getInvite(
      createMockRequest(undefined, {}, { method: "GET" }),
      context(),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get("pending_invite_token")).toBeUndefined();
    const body = await parseJsonResponse<{
      invite: { email: string; jurisdictions: unknown[] };
    }>(response);
    expect(body.invite.email).toBe(EMAIL);
    expect(body.invite.jurisdictions).toHaveLength(1);
  });
});

describe("POST /api/auth/invite/[token]/apply", () => {
  beforeEach(() => {
    mockAuthSession(
      createMockSession({
        user: {
          id: USER_ID,
          email: EMAIL,
          privilegeLevel: PrivilegeLevel.ReadAccess,
        },
        privilegeLevel: PrivilegeLevel.ReadAccess,
      }),
    );
    inviteMock.findUnique.mockResolvedValue(invite());
    inviteMock.findFirst.mockResolvedValue(invite());
    inviteMock.updateMany.mockResolvedValue({ count: 1 });
    privilegedUserMock.findUnique.mockResolvedValue(null);
    privilegedUserMock.upsert.mockResolvedValue({});
    userMock.update.mockResolvedValue({});
    userMock.findUnique.mockResolvedValue({ privilegeLevel: PrivilegeLevel.Admin });
    userJurisdictionMock.findFirst.mockResolvedValue(null);
    userJurisdictionMock.findUnique.mockResolvedValue(null);
    userJurisdictionMock.create.mockResolvedValue({
      id: "uj-1",
      cityTown: "Rochester",
      legDistrict: 1,
      termId: DEFAULT_ACTIVE_TERM_ID,
    });
    (prismaMock.auditLog as unknown as { create: jest.Mock }).create
      .mockResolvedValue({});
  });

  it("applies the clicked invite and writes audit inside the transaction", async () => {
    const response = await applyInvite(
      createMockRequest(undefined, {}, { method: "POST" }),
      context(),
    );

    expect(response.status).toBe(200);
    const body = await parseJsonResponse<{ status: string }>(response);
    expect(body.status).toBe("applied");
    expect(inviteMock.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: INVITE_ID, email: EMAIL }),
      data: { usedAt: expect.any(Date) },
    });
    expect(
      (prismaMock.auditLog as unknown as { create: jest.Mock }).create,
    ).toHaveBeenCalled();
  });

  it("rejects stale stored invite scope before consuming the invite", async () => {
    inviteMock.findUnique.mockResolvedValue(
      invite({
        jurisdictions: [
          {
            id: "ij-1",
            inviteId: INVITE_ID,
            cityTown: "Rochester",
            legDistrict: 1,
            termId: "stale-term",
            createdAt: new Date(),
          },
        ],
      }),
    );

    const response = await applyInvite(
      createMockRequest(undefined, {}, { method: "POST" }),
      context(),
    );

    expect(response.status).toBe(409);
    const body = await parseJsonResponse<{ reason: string }>(response);
    expect(body.reason).toBe("stale-term");
    expect(inviteMock.updateMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/auth/invite/pending", () => {
  it("returns the caller's own pending invite by session email", async () => {
    mockAuthSession(
      createMockSession({
        user: {
          id: USER_ID,
          email: EMAIL,
          privilegeLevel: PrivilegeLevel.ReadAccess,
        },
        privilegeLevel: PrivilegeLevel.ReadAccess,
      }),
    );
    inviteMock.findFirst.mockResolvedValue(invite());

    const response = await getPendingInvite(
      createMockRequest(undefined, {}, { method: "GET" }),
    );

    expect(response.status).toBe(200);
    const body = await parseJsonResponse<{ token: string }>(response);
    expect(body.token).toBe(TOKEN);
    expect(inviteMock.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({ email: EMAIL, usedAt: null }),
      include: expect.any(Object),
    });
  });
});
