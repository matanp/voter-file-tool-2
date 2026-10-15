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
import { PrivilegeLevel, type MembershipType } from "@prisma/client";
import { z } from "zod";
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
} from "~/lib/validations/committee";
import type { CommitteeAction, CommitteeRef } from "./committeeAction";

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
  return committee.legDistrict > 0 ? { legDistrict: committee.legDistrict } : {};
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
  /** Restrict to voters living in the committee's town, LD and ED. */
  onlyEligible: boolean;
};

export function candidateSearchQuery(
  committee: CommitteeRef,
  input: CandidateSearchInput,
): SearchQueryField[] {
  const query: SearchQueryField[] = [];
  if (input.onlyEligible) {
    query.push({ field: searchableFieldEnum.enum.city, values: [committee.cityTown] });
    if (committee.legDistrict > 0) {
      query.push({
        field: searchableFieldEnum.enum.L_T,
        values: [String(committee.legDistrict)],
      });
    }
    query.push({
      field: searchableFieldEnum.enum.electionDistrict,
      values: [committee.electionDistrict],
    });
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
  const response = await fetch("/api/fetchFilteredData", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      searchQuery: normalizeSearchQuery(query),
      page: 1,
      pageSize: CANDIDATE_PAGE_SIZE,
    }),
    signal,
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(errorMessage(body, "Unable to search voter records."));
  }
  const parsed = candidateSearchResponseSchema.parse(body);
  return {
    candidates: parsed.data,
    total: parsed.totalRecords ?? parsed.data.length,
  };
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

  if (mode === "add") {
    return {
      ok: true,
      message: response.idempotent
        ? "Member already connected to committee"
        : "Committee member added successfully",
    };
  }
  const warningText = (response.warnings ?? []).map((w) => w.message).join(" ");
  return {
    ok: true,
    message: warningText
      ? `Submitted your request for approval. ${warningText}`
      : "Submitted your request for approval",
  };
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
