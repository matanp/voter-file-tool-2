/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PrivilegeLevel } from "@prisma/client";
import {
  applyPendingInvite,
  findValidUnusedInvite,
  InviteGrantError,
} from "~/lib/applyPendingInvite";
import { prismaMock } from "../utils/mocks";

const inviteMock = prismaMock.invite as unknown as {
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  updateMany: jest.Mock;
};
const userMock = prismaMock.user as unknown as { update: jest.Mock };
const privilegedUserMock = prismaMock.privilegedUser as unknown as {
  findUnique: jest.Mock;
  upsert: jest.Mock;
};
const userJurisdictionMock = prismaMock.userJurisdiction as unknown as {
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
};

const EMAIL = "leader@example.com";
const USER_ID = "user-1";
const INVITE_ID = "invite-1";
const CREATED_BY = "admin-1";
const TERM_ID = "term-1";

function buildInvite(overrides: Record<string, unknown> = {}) {
  return {
    id: INVITE_ID,
    email: EMAIL,
    token: "token-1",
    privilegeLevel: PrivilegeLevel.Leader,
    customMessage: null,
    expiresAt: new Date(Date.now() + 86400000),
    usedAt: null,
    createdBy: CREATED_BY,
    createdAt: new Date(),
    deleted: false,
    deletedAt: null,
    jurisdictions: [
      {
        id: "ij-1",
        inviteId: INVITE_ID,
        cityTown: "Rochester",
        legDistrict: 1,
        termId: TERM_ID,
        createdAt: new Date(),
      },
    ],
    ...overrides,
  };
}

describe("applyPendingInvite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    inviteMock.findFirst.mockResolvedValue(null);
    inviteMock.findUnique.mockResolvedValue(null);
    inviteMock.updateMany.mockResolvedValue({ count: 1 });
    userMock.update.mockResolvedValue({});
    privilegedUserMock.findUnique.mockResolvedValue(null);
    privilegedUserMock.upsert.mockResolvedValue({});
    userJurisdictionMock.findFirst.mockResolvedValue(null);
    userJurisdictionMock.findUnique.mockResolvedValue(null);
    userJurisdictionMock.create.mockResolvedValue({
      id: "uj-1",
      cityTown: "Rochester",
      legDistrict: 1,
      termId: TERM_ID,
    });
  });

  it("resolves pending invites by email only", async () => {
    const invite = buildInvite();
    inviteMock.findFirst.mockResolvedValue(invite);

    const result = await applyPendingInvite(EMAIL, USER_ID, {
      expectedInviteId: INVITE_ID,
    });

    expect(result.status).toBe("applied");
    expect(inviteMock.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        email: EMAIL,
        usedAt: null,
        deleted: false,
      }),
      include: { jurisdictions: true },
    });
    expect(inviteMock.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: INVITE_ID, email: EMAIL }),
      data: { usedAt: expect.any(Date) },
    });
  });

  it("rejects when the email-resolved pending invite is not the clicked invite", async () => {
    inviteMock.findFirst.mockResolvedValue(buildInvite({ id: "other-invite" }));

    await expect(
      applyPendingInvite(EMAIL, USER_ID, { expectedInviteId: INVITE_ID }),
    ).rejects.toThrow(InviteGrantError);
    expect(inviteMock.updateMany).not.toHaveBeenCalled();
  });

  it("returns already_applied for the exact expected used invite even when another pending invite exists", async () => {
    inviteMock.findUnique.mockResolvedValue(
      buildInvite({ usedAt: new Date() }),
    );
    privilegedUserMock.findUnique.mockResolvedValue({
      email: EMAIL,
      privilegeLevel: PrivilegeLevel.Leader,
    });
    userJurisdictionMock.findUnique.mockResolvedValue({
      id: "uj-1",
      cityTown: "Rochester",
      legDistrict: 1,
      termId: TERM_ID,
    });
    inviteMock.findFirst.mockResolvedValue(
      buildInvite({ id: "new-pending-invite" }),
    );

    const result = await applyPendingInvite(EMAIL, USER_ID, {
      expectedInviteId: INVITE_ID,
    });

    expect(result.status).toBe("already_applied");
    expect(inviteMock.updateMany).not.toHaveBeenCalled();
  });

  it("returns no_invite when neither a pending nor a used invite exists", async () => {
    const result = await applyPendingInvite(EMAIL, USER_ID);

    expect(result.status).toBe("no_invite");
    expect(inviteMock.updateMany).not.toHaveBeenCalled();
    expect(userMock.update).not.toHaveBeenCalled();
  });

  it("rejects a Leader invite that carries no jurisdiction scope", async () => {
    inviteMock.findFirst.mockResolvedValue(buildInvite({ jurisdictions: [] }));

    await expect(applyPendingInvite(EMAIL, USER_ID)).rejects.toThrow(
      InviteGrantError,
    );
    expect(inviteMock.updateMany).not.toHaveBeenCalled();
    expect(userMock.update).not.toHaveBeenCalled();
  });

  it("throws when the invite cannot be consumed and was not already applied", async () => {
    inviteMock.findFirst.mockResolvedValue(buildInvite());
    inviteMock.updateMany.mockResolvedValue({ count: 0 });
    privilegedUserMock.findUnique.mockResolvedValue(null);

    await expect(applyPendingInvite(EMAIL, USER_ID)).rejects.toThrow(
      InviteGrantError,
    );
    expect(userMock.update).not.toHaveBeenCalled();
    expect(userJurisdictionMock.create).not.toHaveBeenCalled();
  });
});

describe("findValidUnusedInvite", () => {
  it("looks up a valid unused invite by email only", async () => {
    const invite = buildInvite();
    inviteMock.findFirst.mockResolvedValue(invite);

    await expect(findValidUnusedInvite(EMAIL)).resolves.toEqual(invite);
    expect(inviteMock.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({ email: EMAIL, usedAt: null }),
    });
  });
});
