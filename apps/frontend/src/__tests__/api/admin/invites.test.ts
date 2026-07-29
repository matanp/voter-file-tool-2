/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Prisma, PrivilegeLevel } from "@prisma/client";
import { POST } from "~/app/api/admin/invites/route";
import {
  createMockRequest,
  createMockSession,
  DEFAULT_ACTIVE_TERM_ID,
  type ErrorResponseBody,
  parseJsonResponse,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

const inviteMock = prismaMock.invite as unknown as {
  findFirst: jest.Mock;
  updateMany: jest.Mock;
  create: jest.Mock;
};
const userMock = prismaMock.user as unknown as { findUnique: jest.Mock };

const ADMIN_ID = "admin-1";
const INVITEE = "invitee@example.com";

type ValidationErrorBody = {
  error: string;
  details?: Array<{ field: string; message: string }>;
};

function adminSession() {
  return createMockSession({
    user: {
      id: ADMIN_ID,
      email: "admin@example.com",
      privilegeLevel: PrivilegeLevel.Admin,
    },
    privilegeLevel: PrivilegeLevel.Admin,
  });
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    email: INVITEE,
    privilegeLevel: PrivilegeLevel.ReadAccess,
    ...overrides,
  };
}

describe("POST /api/admin/invites", () => {
  beforeEach(() => {
    mockAuthSession(adminSession());
    mockHasPermission(true);
    userMock.findUnique.mockResolvedValue(null);
    inviteMock.updateMany.mockResolvedValue({ count: 0 });
    inviteMock.findFirst.mockResolvedValue(null);
    inviteMock.create.mockResolvedValue({
      id: "invite-1",
      email: INVITEE,
      privilegeLevel: PrivilegeLevel.ReadAccess,
      customMessage: null,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    });
  });

  it("rejects an unauthenticated caller with 401", async () => {
    mockAuthSession(null);

    const response = await POST(createMockRequest(body()));

    expect(response.status).toBe(401);
    expect(inviteMock.create).not.toHaveBeenCalled();
  });

  it("rejects a caller without Admin privilege with 403", async () => {
    mockAuthSession(
      createMockSession({
        user: {
          id: "reader-1",
          email: "reader@example.com",
          privilegeLevel: PrivilegeLevel.ReadAccess,
        },
        privilegeLevel: PrivilegeLevel.ReadAccess,
      }),
    );
    mockHasPermission(false);

    const response = await POST(createMockRequest(body()));

    expect(response.status).toBe(403);
    expect(inviteMock.create).not.toHaveBeenCalled();
  });

  it("rejects a non-Leader invite that carries jurisdictions", async () => {
    const response = await POST(
      createMockRequest(
        body({
          privilegeLevel: PrivilegeLevel.ReadAccess,
          jurisdictions: [
            {
              cityTown: "Rochester",
              legDistrict: 1,
              termId: DEFAULT_ACTIVE_TERM_ID,
            },
          ],
        }),
      ),
    );

    expect(response.status).toBe(400);
    const json = await parseJsonResponse<ValidationErrorBody>(response);
    expect(json.error).toBe("Validation error");
    expect(json.details?.[0]?.message).toBe(
      "Only Leader invites can include jurisdictions",
    );
    expect(inviteMock.create).not.toHaveBeenCalled();
  });

  it("rejects a Leader invite that omits jurisdiction scope", async () => {
    const response = await POST(
      createMockRequest(body({ privilegeLevel: PrivilegeLevel.Leader })),
    );

    expect(response.status).toBe(400);
    const json = await parseJsonResponse<ValidationErrorBody>(response);
    expect(json.error).toBe("Validation error");
    expect(json.details?.[0]?.message).toBe(
      "Leader invites require at least one jurisdiction",
    );
    expect(inviteMock.create).not.toHaveBeenCalled();
  });

  it("rejects when a user already exists for the email", async () => {
    userMock.findUnique.mockResolvedValue({ id: "existing", email: INVITEE });

    const response = await POST(createMockRequest(body()));

    expect(response.status).toBe(400);
    const json = await parseJsonResponse<ErrorResponseBody>(response);
    expect(json.error).toBe("User with this email already exists");
    expect(inviteMock.create).not.toHaveBeenCalled();
  });

  it("rejects when a valid pending invite already exists", async () => {
    inviteMock.findFirst.mockResolvedValue({ id: "pending-1", email: INVITEE });

    const response = await POST(createMockRequest(body()));

    expect(response.status).toBe(400);
    const json = await parseJsonResponse<ErrorResponseBody>(response);
    expect(json.error).toBe("A valid invite already exists for this email");
    expect(inviteMock.create).not.toHaveBeenCalled();
  });

  it("maps a P2002 unique-constraint violation to a duplicate-invite error", async () => {
    inviteMock.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.0.0",
      }),
    );

    const response = await POST(createMockRequest(body()));

    expect(response.status).toBe(400);
    const json = await parseJsonResponse<ErrorResponseBody>(response);
    expect(json.error).toBe("A valid invite already exists for this email");
  });
});
