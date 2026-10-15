/**
 * Action adapters (plan §8): translate drawer actions into the request bodies
 * the existing `add` / `requestAdd` / `remove` endpoints accept, keyed on the
 * composite key the action's `CommitteeRef` carries. Bodies are checked
 * against the endpoints' own Zod schemas, so a drift fails here.
 */
import { PrivilegeLevel } from "@prisma/client";

import {
  candidateSearchQuery,
  candidateSubmissionMode,
  submitCandidate,
} from "~/app/committees/workspace/adapters";
import type {
  CommitteeAction,
  CommitteeRef,
} from "~/app/committees/workspace/committeeAction";
import { hasPermissionFor } from "~/lib/utils";
import type * as UtilsModule from "~/lib/utils";
import {
  committeeDataSchema,
  committeeRequestDataSchema,
} from "~/lib/validations/committee";

const GREECE: CommitteeRef = {
  committeeListId: 7,
  cityTown: "GREECE",
  legDistrict: 1,
  electionDistrict: 5,
};
/** A town without legislative districts: the sentinel, never sent. */
const NO_LD: CommitteeRef = { ...GREECE, legDistrict: -1 };

const ADD: CommitteeAction = { kind: "add-member", committee: GREECE, seatNumber: 2 };
const REPLACE: CommitteeAction = {
  kind: "replace-member",
  committee: GREECE,
  memberId: "V-OLD",
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

let fetchMock: jest.Mock;
function respond(body: unknown, status = 200) {
  fetchMock = jest.fn(async () => jsonResponse(body, status));
  global.fetch = fetchMock as unknown as typeof fetch;
}
function sent(): { url: string; body: unknown } {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url, body: JSON.parse(String(init.body)) as unknown };
}

beforeEach(() => {
  jest
    .mocked(hasPermissionFor)
    .mockImplementation(
      jest.requireActual<typeof UtilsModule>("~/lib/utils").hasPermissionFor,
    );
});

describe("candidateSubmissionMode", () => {
  it("adds directly for Admin and Developer, submits for Leader and RequestAccess", () => {
    expect(candidateSubmissionMode(ADD, PrivilegeLevel.Admin)).toBe("add");
    expect(candidateSubmissionMode(ADD, PrivilegeLevel.Developer)).toBe("add");
    expect(candidateSubmissionMode(ADD, PrivilegeLevel.Leader)).toBe("submit");
    expect(candidateSubmissionMode(ADD, PrivilegeLevel.RequestAccess)).toBe("submit");
  });

  it("offers nothing to ReadAccess", () => {
    expect(candidateSubmissionMode(ADD, PrivilegeLevel.ReadAccess)).toBeNull();
    expect(candidateSubmissionMode(REPLACE, PrivilegeLevel.ReadAccess)).toBeNull();
  });

  it("always submits a replacement, and never offers it to Admin", () => {
    expect(candidateSubmissionMode(REPLACE, PrivilegeLevel.Leader)).toBe("submit");
    expect(candidateSubmissionMode(REPLACE, PrivilegeLevel.Admin)).toBeNull();
  });
});

describe("candidateSearchQuery", () => {
  it("restricts to the committee's town, LD and ED when only-eligible is on", () => {
    expect(
      candidateSearchQuery(GREECE, {
        voterId: " 123 ",
        firstName: "",
        lastName: "Doe",
        onlyEligible: true,
      }),
    ).toEqual([
      { field: "city", values: ["GREECE"] },
      { field: "L_T", values: ["1"] },
      { field: "electionDistrict", values: [5] },
      { field: "VRCNUM", values: ["123"] },
      { field: "lastName", values: ["Doe"] },
    ]);
  });

  it("drops the district restriction when only-eligible is off, and never sends the LD sentinel", () => {
    expect(
      candidateSearchQuery(GREECE, {
        voterId: "",
        firstName: "Jane",
        lastName: "",
        onlyEligible: false,
      }),
    ).toEqual([{ field: "firstName", values: ["Jane"] }]);
    expect(
      candidateSearchQuery(NO_LD, {
        voterId: "",
        firstName: "",
        lastName: "",
        onlyEligible: true,
      }),
    ).toEqual([
      { field: "city", values: ["GREECE"] },
      { field: "electionDistrict", values: [5] },
    ]);
  });
});

describe("submitCandidate", () => {
  const details = {
    candidateId: "V-NEW",
    membershipType: "PETITIONED" as const,
    email: " jane@example.com ",
    phone: "",
    notes: "  Met at caucus ",
  };

  it("posts an Admin add to /api/committee/add with a body the endpoint accepts", async () => {
    respond({ success: true, message: "Member added to committee" });
    const outcome = await submitCandidate(ADD, "add", details);

    const { url, body } = sent();
    expect(url).toBe("/api/committee/add");
    expect(body).toEqual({
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 5,
      memberId: "V-NEW",
      membershipType: "PETITIONED",
      email: "jane@example.com",
    });
    expect(committeeDataSchema.safeParse(body).success).toBe(true);
    expect(outcome).toEqual({
      ok: true,
      message: "Committee member added successfully",
    });
  });

  it("sends an Admin override only with a reason", async () => {
    respond({ success: true, message: "Member added to committee" });
    await submitCandidate(ADD, "add", { ...details, overrideReason: " Board vote " });
    expect(sent().body).toMatchObject({ forceAdd: true, overrideReason: "Board vote" });

    respond({ success: true, message: "Member added to committee" });
    await submitCandidate(ADD, "add", { ...details, overrideReason: "  " });
    expect(sent().body).not.toHaveProperty("forceAdd");
  });

  it("omits the LD sentinel", async () => {
    respond({ success: true, message: "ok" });
    await submitCandidate({ ...ADD, committee: NO_LD }, "add", details);
    expect(sent().body).not.toHaveProperty("legDistrict");
    expect(committeeDataSchema.safeParse(sent().body).success).toBe(true);
  });

  it("reports an idempotent add with the existing toast copy", async () => {
    respond({ success: true, message: "already", idempotent: true });
    await expect(submitCandidate(ADD, "add", details)).resolves.toEqual({
      ok: true,
      message: "Member already connected to committee",
    });
  });

  it("submits a candidate through requestAdd, with notes and without Admin-only fields", async () => {
    respond({ success: true, message: "ok" });
    const outcome = await submitCandidate(ADD, "submit", {
      ...details,
      overrideReason: "ignored",
    });

    const { url, body } = sent();
    expect(url).toBe("/api/committee/requestAdd");
    expect(body).toEqual({
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 5,
      addMemberId: "V-NEW",
      requestNotes: "Met at caucus",
      email: "jane@example.com",
    });
    expect(committeeRequestDataSchema.safeParse(body).success).toBe(true);
    expect(outcome).toEqual({ ok: true, message: "Submitted your request for approval" });
  });

  it("carries the replacement target for replace-member", async () => {
    respond({
      success: true,
      message: "ok",
      warnings: [{ code: "POSSIBLY_INACTIVE", message: "Possibly inactive." }],
    });
    const outcome = await submitCandidate(REPLACE, "submit", details);
    expect(sent().body).toMatchObject({ addMemberId: "V-NEW", removeMemberId: "V-OLD" });
    expect(committeeRequestDataSchema.safeParse(sent().body).success).toBe(true);
    expect(outcome).toEqual({
      ok: true,
      message: "Submitted your request for approval. Possibly inactive.",
    });
  });

  it("returns server hard stops as an ineligible outcome", async () => {
    respond({ success: false, error: "INELIGIBLE", reasons: ["CAPACITY"] }, 422);
    await expect(submitCandidate(ADD, "add", details)).resolves.toEqual({
      ok: false,
      kind: "ineligible",
      reasons: ["CAPACITY"],
    });
  });

  it("returns any other failure as an error with the server's message", async () => {
    respond({ success: false, error: "You do not have jurisdiction access for this committee" }, 403);
    await expect(submitCandidate(ADD, "submit", details)).resolves.toEqual({
      ok: false,
      kind: "error",
      message: "You do not have jurisdiction access for this committee",
    });

    fetchMock = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(submitCandidate(ADD, "add", details)).resolves.toEqual({
      ok: false,
      kind: "error",
      message: "Failed to fetch",
    });
  });
});
