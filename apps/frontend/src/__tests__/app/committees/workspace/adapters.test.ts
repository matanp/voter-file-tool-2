/**
 * Action adapters (plan §8): translate drawer actions into the request bodies
 * the existing `add` / `requestAdd` / `remove` endpoints accept, keyed on the
 * composite key the action's `CommitteeRef` carries. Bodies are checked
 * against the endpoints' own Zod schemas, so a drift fails here.
 */
import { PrivilegeLevel } from "@prisma/client";

import {
  canFilterEligibleOnly,
  candidateSearchQuery,
  candidateSubmissionMode,
  removalProblems,
  resignationProblems,
  submitCandidate,
  submitRemoval,
  submitResignation,
} from "~/app/committees/workspace/adapters";
import type {
  CandidateCommitteeRef,
  CommitteeAction,
  CommitteeRef,
} from "~/app/committees/workspace/committeeAction";
import { hasPermissionFor } from "~/lib/utils";
import { fetchJsonResponse, installFetchMock } from "../../../utils/mocks";
import type * as UtilsModule from "~/lib/utils";
import {
  committeeDataSchema,
  committeeRequestDataSchema,
  removeCommitteeDataSchema,
  resignCommitteeDataSchema,
} from "~/lib/validations/committee";

const GREECE: CommitteeRef = {
  committeeListId: 7,
  cityTown: "GREECE",
  legDistrict: 1,
  electionDistrict: 5,
};
const GREECE_CANDIDATE: CandidateCommitteeRef = {
  ...GREECE,
  assemblyDistrict: "134",
};
/** A town without legislative districts: the sentinel, never sent. */
const NO_LD: CommitteeRef = { ...GREECE, legDistrict: -1 };
const NO_LD_CANDIDATE: CandidateCommitteeRef = { ...GREECE_CANDIDATE, legDistrict: -1 };
/** The committee's ED has no crosswalk entry. */
const NO_AD: CandidateCommitteeRef = { ...GREECE_CANDIDATE, assemblyDistrict: null };

const ADD: CommitteeAction = { kind: "add-member", committee: GREECE_CANDIDATE, seatNumber: 2 };
const REPLACE: CommitteeAction = {
  kind: "replace-member",
  committee: GREECE_CANDIDATE,
  memberId: "V-OLD",
};

let fetchMock: ReturnType<typeof installFetchMock>;
function respond(body: unknown, status = 200) {
  fetchMock = installFetchMock(async () => fetchJsonResponse(body, status));
}
function sent(): { url: string; body: unknown } {
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  return { url: String(url), body: JSON.parse(String(init?.body)) as unknown };
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
  const ELIGIBLE_ONLY = { voterId: "", firstName: "", lastName: "", onlyEligible: true };

  it("restricts to the committee's assembly district when only-eligible is on", () => {
    const query = candidateSearchQuery(
      GREECE_CANDIDATE,
      { voterId: " 123 ", firstName: "", lastName: "Doe", onlyEligible: true },
      true,
    );
    expect(query).toEqual([
      { field: "stateAssmblyDistrict", values: ["134"] },
      { field: "VRCNUM", values: ["123"] },
      { field: "lastName", values: ["Doe"] },
    ]);
    // Town, LD and ED don't decide residency.
    const fields = query.map((f) => f.field);
    expect(fields).not.toContain("city");
    expect(fields).not.toContain("L_T");
    expect(fields).not.toContain("electionDistrict");
  });

  it("filters a town without LDs by AD alone", () => {
    expect(candidateSearchQuery(NO_LD_CANDIDATE, ELIGIBLE_ONLY, true)).toEqual([
      { field: "stateAssmblyDistrict", values: ["134"] },
    ]);
  });

  it("drops the residency restriction when only-eligible is off", () => {
    expect(
      candidateSearchQuery(
        GREECE_CANDIDATE,
        { voterId: "", firstName: "Jane", lastName: "", onlyEligible: false },
        true,
      ),
    ).toEqual([{ field: "firstName", values: ["Jane"] }]);
  });

  it("adds no residency condition when requireAssemblyDistrictMatch is off", () => {
    expect(candidateSearchQuery(GREECE_CANDIDATE, ELIGIBLE_ONLY, false)).toEqual([]);
    expect(
      candidateSearchQuery(
        GREECE_CANDIDATE,
        { voterId: "", firstName: "Jane", lastName: "", onlyEligible: true },
        false,
      ),
    ).toEqual([{ field: "firstName", values: ["Jane"] }]);
  });

  it("never falls back to the ED for a committee with no AD", () => {
    expect(candidateSearchQuery(NO_AD, ELIGIBLE_ONLY, true)).toEqual([]);
  });
});

describe("canFilterEligibleOnly", () => {
  it("is offered when the committee has an AD, or when the AD check is off", () => {
    expect(canFilterEligibleOnly(GREECE_CANDIDATE, true)).toBe(true);
    expect(canFilterEligibleOnly(GREECE_CANDIDATE, false)).toBe(true);
    expect(canFilterEligibleOnly(NO_AD, false)).toBe(true);
  });

  it("is not offered when the AD check is on and the committee has no AD", () => {
    expect(canFilterEligibleOnly(NO_AD, true)).toBe(false);
  });
});

describe("submitRemoval", () => {
  const REMOVE: CommitteeAction = { kind: "remove-member", committee: GREECE, memberId: "V-OLD" };

  it("posts the removal with reason and trimmed notes in the body /api/committee/remove accepts", async () => {
    respond({ status: "success" });
    const outcome = await submitRemoval(REMOVE, { reason: "OTHER", notes: "  Moved away  " });

    const { url, body } = sent();
    expect(url).toBe("/api/committee/remove");
    expect(body).toEqual({
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 5,
      memberId: "V-OLD",
      removalReason: "OTHER",
      removalNotes: "Moved away",
    });
    expect(removeCommitteeDataSchema.safeParse(body).success).toBe(true);
    expect(outcome).toEqual({ ok: true, message: "Committee member removed successfully" });
  });

  it("omits blank notes and the LD sentinel", async () => {
    respond({ status: "success" });
    await submitRemoval({ ...REMOVE, committee: NO_LD }, { reason: "DECEASED", notes: " " });
    expect(sent().body).not.toHaveProperty("removalNotes");
    expect(sent().body).not.toHaveProperty("legDistrict");
    expect(removeCommitteeDataSchema.safeParse(sent().body).success).toBe(true);
  });

  it("reports the endpoint's status error", async () => {
    respond({ status: "error", error: "Member does not have an active membership in this committee" }, 400);
    await expect(submitRemoval(REMOVE, { reason: "DECEASED", notes: "" })).resolves.toEqual({
      ok: false,
      kind: "error",
      message: "Member does not have an active membership in this committee",
    });
  });
});

describe("submitResignation", () => {
  const RESIGN: CommitteeAction = {
    kind: "record-resignation",
    committee: GREECE,
    memberId: "V-OLD",
  };

  it("posts a RESIGN body with date, method and reason that the endpoint accepts", async () => {
    respond({ status: "success" });
    const outcome = await submitResignation(RESIGN, {
      dateReceived: "2026-10-01",
      method: "MAIL",
      reason: "MOVED_OUT_OF_DISTRICT",
      notes: "",
    });

    const { url, body } = sent();
    expect(url).toBe("/api/committee/remove");
    expect(body).toEqual({
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 5,
      memberId: "V-OLD",
      action: "RESIGN",
      resignationDateReceived: "2026-10-01",
      resignationMethod: "MAIL",
      resignationReason: "MOVED_OUT_OF_DISTRICT",
    });
    expect(resignCommitteeDataSchema.safeParse(body).success).toBe(true);
    expect(outcome).toEqual({ ok: true, message: "Resignation recorded successfully" });
  });

  it("a status error delivered with 200 is still a failure", async () => {
    respond({ status: "error", error: "Committee not found" });
    await expect(
      submitResignation(RESIGN, { dateReceived: "2026-10-01", method: "EMAIL", reason: "OTHER", notes: "x" }),
    ).resolves.toEqual({ ok: false, kind: "error", message: "Committee not found" });
  });
});

describe("member exit validation", () => {
  it("requires a reason, and notes for Other", () => {
    expect(removalProblems({ reason: "", notes: "" })).toEqual(["Choose a reason."]);
    expect(removalProblems({ reason: "OTHER", notes: " " })).toEqual([
      "Notes are required when the reason is Other.",
    ]);
    expect(removalProblems({ reason: "OTHER", notes: "why" })).toEqual([]);
  });

  it("requires the received date, method and reason for a resignation", () => {
    expect(
      resignationProblems({ dateReceived: "", method: "", reason: "", notes: "" }),
    ).toEqual([
      "Enter the date the resignation was received.",
      "Choose how it was received.",
      "Choose a reason.",
    ]);
    expect(
      resignationProblems({ dateReceived: "2026-10-01", method: "EMAIL", reason: "DECEASED", notes: "" }),
    ).toEqual([]);
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
    await submitCandidate({ ...ADD, committee: NO_LD_CANDIDATE }, "add", details);
    expect(sent().body).not.toHaveProperty("legDistrict");
    expect(committeeDataSchema.safeParse(sent().body).success).toBe(true);
  });

  it("carries the add's nonblocking warnings into the success message", async () => {
    respond({
      success: true,
      message: "ok",
      warnings: [{ code: "RECENT_RESIGNATION", message: "Resigned recently." }],
    });
    await expect(submitCandidate(ADD, "add", details)).resolves.toEqual({
      ok: true,
      message: "Committee member added successfully. Resigned recently.",
    });
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

    fetchMock = installFetchMock(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(submitCandidate(ADD, "add", details)).resolves.toEqual({
      ok: false,
      kind: "error",
      message: "Failed to fetch",
    });
  });
});
