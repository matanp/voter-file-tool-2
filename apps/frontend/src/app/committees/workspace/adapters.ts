/**
 * Action adapters (plan §8, §9): the only place the action drawer's requests
 * meet endpoint URLs. Each translates a `CommitteeAction` into the body the
 * existing endpoint already accepts (`/api/committee/add`, `requestAdd`,
 * `remove`), keyed on the composite key the action's `CommitteeRef` carries.
 * Thin by design: no command-service changes (map "Out of scope").
 *
 * Which endpoint a candidate goes to follows the *acting* privilege (client
 * visibility only, skills/auth-check-patterns); every endpoint re-checks the
 * actual session privilege and decides eligibility itself.
 */
import {
  PrivilegeLevel,
  type MembershipType,
  type RemovalReason,
  type ResignationMethod,
  type VoterRecord,
} from "@prisma/client";
import { z } from "zod";
// The client-safe entry point: the package root also exports PrismaClient.
import { committeeResidencySearchFilter } from "@voter-file-tool/shared-prisma/committeeResidency";
import {
  normalizeSearchQuery,
  searchableFieldEnum,
  type SearchQueryField,
} from "@voter-file-tool/shared-validators";

import type { EligibilityWarning } from "~/lib/eligibility";
import type { EligibilityPreflightResponse } from "~/lib/eligibilityPreflight";
import { hasPermissionFor } from "~/lib/utils";
import type {
  committeeDataSchema,
  committeeRequestDataSchema,
  removeCommitteeDataSchema,
  resignCommitteeDataSchema,
} from "~/lib/validations/committee";
import {
  hasLegDistrict,
  type CandidateCommitteeRef,
  type CommitteeAction,
  type CommitteeRef,
} from "./committeeAction";

/** The add-flow actions: both pick a candidate. */
export type CandidateAction = Extract<
  CommitteeAction,
  { kind: "add-member" | "replace-member" }
>;

/** `add`: Admin direct add. `submit`: a candidate submitted for review. */
export type CandidateSubmissionMode = "add" | "submit";

/**
 * How `action` is carried out at the acting privilege, or null when it is not
 * offered: ReadAccess gets nothing, and Admin is not offered replace (plan §8
 * "Replacement in v1").
 */
export function candidateSubmissionMode(
  action: CandidateAction,
  actingPermissions: PrivilegeLevel,
): CandidateSubmissionMode | null {
  if (!hasPermissionFor(actingPermissions, PrivilegeLevel.RequestAccess)) {
    return null;
  }
  const isAdmin = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);
  if (action.kind === "replace-member") return isAdmin ? null : "submit";
  return isAdmin ? "add" : "submit";
}

/**
 * The legislative district as the endpoints take it: towns without LDs carry
 * the sentinel (-1) in read models, and the endpoints want the key omitted.
 */
function legDistrictParam(committee: CommitteeRef): { legDistrict?: number } {
  return hasLegDistrict(committee) ? { legDistrict: committee.legDistrict } : {};
}

function trimmedOrOmit<K extends string>(
  key: K,
  value: string | undefined,
): Partial<Record<K, string>> {
  const trimmed = value?.trim();
  return trimmed ? ({ [key]: trimmed } as Record<K, string>) : {};
}

// --- Candidate search ----------------------------------------------------------

export type CandidateSearchInput = {
  voterId: string;
  firstName: string;
  lastName: string;
  /**
   * Restrict to voters who meet the residency rule: living in the committee's
   * assembly district (town, LD and ED don't matter). Adds nothing when
   * `requireAssemblyDistrictMatch` is off, as the server then checks no
   * residency. Not offered for a committee with no AD (`canFilterEligibleOnly`).
   */
  onlyEligible: boolean;
};

/**
 * False when the AD check is on but the committee's ED has no crosswalk entry:
 * there is no AD to filter by, and the server would stop every candidate. The
 * committee's ED is deliberately not used instead.
 */
export function canFilterEligibleOnly(
  committee: CandidateCommitteeRef,
  requireAssemblyDistrictMatch: boolean,
): boolean {
  return (
    committeeResidencySearchFilter(
      committee.assemblyDistrict,
      requireAssemblyDistrictMatch,
    ) !== null
  );
}

export function candidateSearchQuery(
  committee: CandidateCommitteeRef,
  input: CandidateSearchInput,
  requireAssemblyDistrictMatch: boolean,
): SearchQueryField[] {
  const query: SearchQueryField[] = [];
  if (input.onlyEligible) {
    query.push(
      ...(committeeResidencySearchFilter(
        committee.assemblyDistrict,
        requireAssemblyDistrictMatch,
      ) ?? []),
    );
  }
  const text: Array<[SearchQueryField["field"], string]> = [
    [searchableFieldEnum.enum.VRCNUM, input.voterId],
    [searchableFieldEnum.enum.firstName, input.firstName],
    [searchableFieldEnum.enum.lastName, input.lastName],
  ];
  for (const [field, value] of text) {
    const trimmed = value.trim();
    if (trimmed) query.push({ field, values: [trimmed] } as SearchQueryField);
  }
  return query;
}

/** The voter fields the drawer shows; everything else in the record is ignored. */
const candidateRecordSchema = z.object({
  VRCNUM: z.string(),
  firstName: z.string().nullish(),
  middleInitial: z.string().nullish(),
  lastName: z.string().nullish(),
  houseNum: z.number().nullish(),
  street: z.string().nullish(),
  apartment: z.string().nullish(),
  city: z.string().nullish(),
  L_T: z.string().nullish(),
  electionDistrict: z.number().nullish(),
  party: z.string().nullish(),
});

export type CandidateRecord = z.infer<typeof candidateRecordSchema>;

const candidateSearchResponseSchema = z.object({
  data: z.array(candidateRecordSchema),
  totalRecords: z.number().optional(),
});

export type CandidateSearchResult = {
  candidates: CandidateRecord[];
  /** Matches across all pages (only the first page is returned). */
  total: number;
};

export const CANDIDATE_PAGE_SIZE = 10;

export async function searchCandidates(
  query: SearchQueryField[],
  signal?: AbortSignal,
): Promise<CandidateSearchResult> {
  const body = await postRecordSearch(
    query,
    CANDIDATE_PAGE_SIZE,
    "Unable to search voter records.",
    signal,
  );
  const parsed = candidateSearchResponseSchema.parse(body);
  return {
    candidates: parsed.data,
    total: parsed.totalRecords ?? parsed.data.length,
  };
}

// --- Voter details ---------------------------------------------------------------

const voterRecordResponseSchema = z.object({
  data: z.array(z.object({ VRCNUM: z.string() }).passthrough()),
});

/**
 * The member's full voter record, for the details view. Goes through record
 * search, so it shows a member exactly what record search would. Resolves to
 * null when the record is gone.
 */
export async function fetchVoterRecord(
  voterRecordId: string,
  signal?: AbortSignal,
): Promise<VoterRecord | null> {
  const body = await postRecordSearch(
    [{ field: searchableFieldEnum.enum.VRCNUM, values: [voterRecordId] }],
    1,
    "Unable to load voter record.",
    signal,
  );
  const record = voterRecordResponseSchema
    .parse(body)
    .data.find((r) => r.VRCNUM === voterRecordId);
  // Dates arrive as strings; `VoterCard` only formats them.
  return (record as VoterRecord | undefined) ?? null;
}

// --- Eligibility preflight -------------------------------------------------------

/** Read-only preflight; the mutation endpoints stay authoritative. */
export async function fetchCandidateEligibility(
  committee: CommitteeRef,
  voterRecordId: string,
  signal?: AbortSignal,
): Promise<EligibilityPreflightResponse> {
  const params = new URLSearchParams({
    voterRecordId,
    committeeListId: String(committee.committeeListId),
  });
  const response = await fetch(`/api/committee/eligibility?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(errorMessage(body, "Failed to check eligibility"));
  }
  return body as EligibilityPreflightResponse;
}

// --- Candidate submission ----------------------------------------------------------

export type CandidateDetails = {
  candidateId: string;
  /** Admin add only; `requestAdd` has no membership type. */
  membershipType?: MembershipType;
  email?: string;
  phone?: string;
  /** Submissions only: notes for the reviewer. */
  notes?: string;
  /** Admin add only: sent with `forceAdd` when non-blank. */
  overrideReason?: string;
};

export type ActionOutcome =
  /** `message` is the success toast's description. */
  | { ok: true; message: string }
  /** The server's hard stops (`INELIGIBLE`). */
  | { ok: false; kind: "ineligible"; reasons: string[] }
  | { ok: false; kind: "error"; message: string };

type AddBody = z.input<typeof committeeDataSchema>;
type RequestAddBody = z.input<typeof committeeRequestDataSchema>;

function addBody(committee: CommitteeRef, details: CandidateDetails): AddBody {
  const overrideReason = details.overrideReason?.trim();
  return {
    cityTown: committee.cityTown,
    ...legDistrictParam(committee),
    electionDistrict: committee.electionDistrict,
    memberId: details.candidateId,
    ...(details.membershipType ? { membershipType: details.membershipType } : {}),
    ...(overrideReason ? { forceAdd: true, overrideReason } : {}),
    ...trimmedOrOmit("email", details.email),
    ...trimmedOrOmit("phone", details.phone),
  };
}

function requestAddBody(
  action: CandidateAction,
  details: CandidateDetails,
): RequestAddBody {
  return {
    cityTown: action.committee.cityTown,
    ...legDistrictParam(action.committee),
    electionDistrict: action.committee.electionDistrict,
    addMemberId: details.candidateId,
    ...(action.kind === "replace-member" ? { removeMemberId: action.memberId } : {}),
    ...trimmedOrOmit("requestNotes", details.notes),
    ...trimmedOrOmit("email", details.email),
    ...trimmedOrOmit("phone", details.phone),
  };
}

type SuccessBody = {
  success?: boolean;
  idempotent?: boolean;
  warnings?: EligibilityWarning[];
};

export async function submitCandidate(
  action: CandidateAction,
  mode: CandidateSubmissionMode,
  details: CandidateDetails,
): Promise<ActionOutcome> {
  const [url, body] =
    mode === "add"
      ? ["/api/committee/add", addBody(action.committee, details)]
      : ["/api/committee/requestAdd", requestAddBody(action, details)];

  const result = await postJson(url, body);
  if (!result.ok) return result;
  const response = (result.body ?? {}) as SuccessBody;
  // Server warnings are nonblocking: both endpoints return them on success,
  // and the toast carries them (the drawer closes).
  const withWarnings = (base: string) => {
    const text = (response.warnings ?? []).map((w) => w.message).join(" ");
    return text ? `${base}. ${text}` : base;
  };

  if (mode === "add") {
    return {
      ok: true,
      message: response.idempotent
        ? "Member already connected to committee"
        : withWarnings("Committee member added successfully"),
    };
  }
  return { ok: true, message: withWarnings("Submitted your request for approval") };
}

// --- Removal and resignation (ticket 14) ---------------------------------------------

export type RemovalAction = Extract<CommitteeAction, { kind: "remove-member" }>;
export type ResignationAction = Extract<CommitteeAction, { kind: "record-resignation" }>;

/** Form state; `""` is "not chosen yet". */
export type RemovalInput = { reason: RemovalReason | ""; notes: string };
export type ResignationInput = {
  dateReceived: string;
  method: ResignationMethod | "";
  reason: RemovalReason | "";
  notes: string;
};

const OTHER_NEEDS_NOTES = "Notes are required when the reason is Other.";

/**
 * What still blocks a removal (SRS 2.5): a reason, and notes for **Other**.
 * Mirrors `removeCommitteeDataSchema`, which the endpoint enforces anyway.
 */
export function removalProblems(input: RemovalInput): string[] {
  if (input.reason === "") return ["Choose a reason."];
  if (input.reason === "OTHER" && input.notes.trim() === "") return [OTHER_NEEDS_NOTES];
  return [];
}

/**
 * What still blocks recording a resignation (SRS 2.3): the received date, the
 * method, a reason, and notes for **Other** (`resignCommitteeDataSchema`).
 */
export function resignationProblems(input: ResignationInput): string[] {
  const problems: string[] = [];
  if (input.dateReceived.trim() === "") {
    problems.push("Enter the date the resignation was received.");
  }
  if (input.method === "") problems.push("Choose how it was received.");
  problems.push(...removalProblems(input));
  return problems;
}

type RemoveBody = z.input<typeof removeCommitteeDataSchema>;
type ResignBody = z.input<typeof resignCommitteeDataSchema>;

function memberKey(action: RemovalAction | ResignationAction) {
  return {
    cityTown: action.committee.cityTown,
    ...legDistrictParam(action.committee),
    electionDistrict: action.committee.electionDistrict,
    memberId: action.memberId,
  };
}

/** Administrative removal (Admin-only endpoint). Call once `removalProblems` is empty. */
export async function submitRemoval(
  action: RemovalAction,
  input: RemovalInput,
): Promise<ActionOutcome> {
  if (input.reason === "") return { ok: false, kind: "error", message: "Choose a reason." };
  const body: RemoveBody = {
    ...memberKey(action),
    removalReason: input.reason,
    ...trimmedOrOmit("removalNotes", input.notes),
  };
  const result = await postJson("/api/committee/remove", body);
  return result.ok ? { ok: true, message: "Committee member removed successfully" } : result;
}

/** Records a resignation (`action: "RESIGN"` on the remove endpoint). */
export async function submitResignation(
  action: ResignationAction,
  input: ResignationInput,
): Promise<ActionOutcome> {
  if (input.reason === "" || input.method === "") {
    return { ok: false, kind: "error", message: resignationProblems(input).join(" ") };
  }
  const body: ResignBody = {
    ...memberKey(action),
    action: "RESIGN",
    resignationDateReceived: input.dateReceived.trim(),
    resignationMethod: input.method,
    resignationReason: input.reason,
    ...trimmedOrOmit("removalNotes", input.notes),
  };
  const result = await postJson("/api/committee/remove", body);
  return result.ok ? { ok: true, message: "Resignation recorded successfully" } : result;
}

// --- Plumbing ----------------------------------------------------------------------

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const { error, message } = body as { error?: unknown; message?: unknown };
    if (typeof error === "string" && error) return error;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

/** POSTs a record search; throws the API's error (or `fallback`) on failure. */
async function postRecordSearch(
  query: SearchQueryField[],
  pageSize: number,
  fallback: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch("/api/fetchFilteredData", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ searchQuery: normalizeSearchQuery(query), page: 1, pageSize }),
    signal,
  });
  const body = await readJson(response);
  if (!response.ok) throw new Error(errorMessage(body, fallback));
  return body;
}

/**
 * POSTs `body` and normalizes the endpoints' failure shapes: `INELIGIBLE`
 * with `reasons` (add, requestAdd), `{ success: false, error }`, and
 * `{ status: "error", error }` (remove, which can say so with a 200).
 */
async function postJson(
  url: string,
  body: unknown,
): Promise<{ ok: true; body: unknown } | Extract<ActionOutcome, { ok: false }>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      ok: false,
      kind: "error",
      message: err instanceof Error ? err.message : "Request failed",
    };
  }
  const json = await readJson(response);
  const failure = json as {
    error?: unknown;
    reasons?: unknown;
    success?: unknown;
    status?: unknown;
  } | null;

  if (failure?.error === "INELIGIBLE") {
    return {
      ok: false,
      kind: "ineligible",
      reasons: Array.isArray(failure.reasons)
        ? failure.reasons.filter((r): r is string => typeof r === "string")
        : [],
    };
  }
  if (!response.ok || failure?.success === false || failure?.status === "error") {
    return {
      ok: false,
      kind: "error",
      message: errorMessage(json, `Request failed with status ${response.status}`),
    };
  }
  return { ok: true, body: json };
}
