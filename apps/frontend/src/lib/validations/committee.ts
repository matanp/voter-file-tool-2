import { z } from "zod";
// TS types below resolve after running `prisma migrate dev` or `prisma generate`.
import {
  type CommitteeList,
  type IneligibilityReason,
  type VoterRecord,
  MeetingType,
  MembershipStatus,
  MembershipType,
  PrivilegeLevel,
  RemovalReason,
  ResignationMethod,
} from "@prisma/client";
import type { EligibilityWarning } from "~/lib/eligibility";

/** Typed shape of CommitteeMembership.submissionMetadata (leader request context). */
export type CommitteeMembershipSubmissionMetadata = {
  removeMemberId?: string;
  requestNotes?: string;
  /** SRS 2.1a — optional contact at time of submission; never written to VoterRecord. */
  email?: string;
  phone?: string;
  /** SRS §2.2 — Snapshot of eligibility warnings at add/request/accept time. */
  eligibilityWarnings?: EligibilityWarning[];
};

/** Response shape from /api/fetchCommitteeList with memberships + voterRecord + seats + maxSeatsPerLted. */
export type FetchCommitteeListResponse = CommitteeList & {
  ltedWeight?: number | string | null;
  /** The committee's AD from LtedDistrictCrosswalk (trimmed), or null when its LTED has none. */
  assemblyDistrict: string | null;
  requireAssemblyDistrictMatch: boolean;
  memberships: Array<{
    voterRecord: VoterRecord;
    membershipType: MembershipType | null;
    seatNumber?: number | null;
    /** SRS 2.1a — submission contact overrides for display (email/phone). */
    submissionMetadata?: CommitteeMembershipSubmissionMetadata | null;
  }>;
  seats?: Array<{
    id: string;
    seatNumber: number;
    isPetitioned: boolean;
    weight: number | string | null;
  }>;
  designationWeightSummary?: {
    totalWeight: number;
    totalContributingSeats: number;
    seats: Array<{
      seatNumber: number;
      isPetitioned: boolean;
      isOccupied: boolean;
      occupantMembershipType: "PETITIONED" | "APPOINTED" | null;
      seatWeight: number | null;
      contributes: boolean;
      contributionWeight: number;
    }>;
    missingWeightSeatNumbers: number[];
  };
  maxSeatsPerLted?: number;
};

// Committee data validation schema
export const committeeDataSchema = z
  .object({
    cityTown: z.string().trim().min(1, "City/Town is required"),
    legDistrict: z
      .union([z.string(), z.number()])
      .optional()
      .refine(
        (val) =>
          val === undefined ||
          (typeof val === "string" ? val.trim() !== "" : true),
        {
          message: "Legislative District cannot be empty when provided",
        },
      )
      .transform((val) => {
        if (val === undefined) return undefined;
        if (typeof val === "string") return val.trim();
        return val.toString();
      })
      .pipe(
        z.coerce
          .number()
          .int()
          .optional()
          .refine((val) => val === undefined || val > 0, {
            message:
              "Legislative District must be a positive integer when provided",
          }),
      ),
    electionDistrict: z.coerce
      .number()
      .int()
      .positive("Election District must be a positive integer"),
    memberId: z.string().trim().min(1, "Member ID is required"),
    membershipType: z.nativeEnum(MembershipType).optional(),
    // SRS §2.1 — Admin override (honored only when user is Admin)
    forceAdd: z.boolean().optional(),
    overrideReason: z.string().trim().max(500).optional(),
    // SRS 2.1a — optional contact for this submission; stored in submissionMetadata only
    email: z
      .string()
      .trim()
      .email("Invalid email format")
      .optional()
      .or(z.literal("")),
    phone: z.string().trim().optional(),
  })
  .strict()
  .transform((data) => ({
    ...data,
    email: data.email === "" ? undefined : data.email,
    phone: data.phone === "" ? undefined : data.phone,
  }));

// Committee request data validation schema
export const committeeRequestDataSchema = z
  .object({
    cityTown: z.string().trim().min(1, "City/Town is required"),
    legDistrict: z.coerce
      .number()
      .int()
      .optional()
      .refine((val) => val === undefined || val > 0, {
        message:
          "Legislative District must be a positive integer when provided",
      }),
    electionDistrict: z.coerce
      .number()
      .int()
      .positive("Election District must be a positive integer"),
    addMemberId: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform((v) => (v == null || v === "" ? undefined : v)),
    removeMemberId: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform((v) => (v == null || v === "" ? undefined : v)),
    requestNotes: z
      .string()
      .trim()
      .max(1000, "Notes must be 1000 characters or fewer")
      .optional(),
    // SRS §2.1 — Admin override (honored only when user is Admin)
    forceAdd: z.boolean().optional(),
    overrideReason: z.string().trim().max(500).optional(),
    // SRS 2.1a — optional contact for this submission; stored in submissionMetadata only
    email: z
      .string()
      .trim()
      .email("Invalid email format")
      .optional()
      .or(z.literal("")),
    phone: z.string().trim().optional(),
  })
  .strict()
  .transform((data) => ({
    ...data,
    email: data.email === "" ? undefined : data.email,
    phone: data.phone === "" ? undefined : data.phone,
  }))
  .refine(
    (data) => {
      const hasAddMember = data.addMemberId && data.addMemberId.trim() !== "";
      const hasRemoveMember =
        data.removeMemberId && data.removeMemberId.trim() !== "";
      return Boolean(hasAddMember) || Boolean(hasRemoveMember);
    },
    {
      message:
        "At least one action is required: either addMemberId or removeMemberId must be provided",
    },
  )
  .refine(
    (data) => Boolean(data.addMemberId?.trim()),
    {
      message:
        "addMemberId is required; remove-only requests should contact an administrator",
    },
  );

// SRS 2.5 — Remove committee member: removalReason required; removalNotes required when OTHER.
export const removeCommitteeDataSchema = z
  .object({
    cityTown: z.string().trim().min(1, "City/Town is required"),
    legDistrict: z
      .union([z.string(), z.number()])
      .optional()
      .refine(
        (val) =>
          val === undefined ||
          (typeof val === "string" ? val.trim() !== "" : true),
        { message: "Legislative District cannot be empty when provided" },
      )
      .transform((val) => {
        if (val === undefined) return undefined;
        if (typeof val === "string") return val.trim();
        return val.toString();
      })
      .pipe(
        z.coerce
          .number()
          .int()
          .optional()
          .refine((val) => val === undefined || val > 0, {
            message:
              "Legislative District must be a positive integer when provided",
          }),
      ),
    electionDistrict: z.coerce
      .number()
      .int()
      .positive("Election District must be a positive integer"),
    memberId: z.string().trim().min(1, "Member ID is required"),
    removalReason: z.nativeEnum(RemovalReason, {
      errorMap: () => ({ message: "Removal reason is required" }),
    }),
    removalNotes: z.string().trim().max(1000).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.removalReason === "OTHER" && (data.removalNotes ?? "").trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Notes are required when reason is Other",
        path: ["removalNotes"],
      });
    }
  });

/** Valid ISO date string for resignationDateReceived. */
const isoDateString = z
  .string()
  .trim()
  .min(1, "Resignation date received is required")
  .refine(
    (s) => {
      const d = new Date(s);
      return !Number.isNaN(d.getTime());
    },
    { message: "Resignation date must be a valid date" },
  );

// SRS 2.3 — Record resignation (action RESIGN) validation schema
export const resignCommitteeDataSchema = z
  .object({
    cityTown: z.string().trim().min(1, "City/Town is required"),
    legDistrict: z
      .union([z.string(), z.number()])
      .optional()
      .refine(
        (val) =>
          val === undefined ||
          (typeof val === "string" ? val.trim() !== "" : true),
        { message: "Legislative District cannot be empty when provided" },
      )
      .transform((val) => {
        if (val === undefined) return undefined;
        if (typeof val === "string") return val.trim();
        return val.toString();
      })
      .pipe(
        z.coerce
          .number()
          .int()
          .optional()
          .refine((val) => val === undefined || val > 0, {
            message:
              "Legislative District must be a positive integer when provided",
          }),
      ),
    electionDistrict: z.coerce
      .number()
      .int()
      .positive("Election District must be a positive integer"),
    memberId: z.string().trim().min(1, "Member ID is required"),
    action: z.literal("RESIGN"),
    resignationReason: z.nativeEnum(RemovalReason, {
      errorMap: () => ({ message: "Resignation reason is required" }),
    }),
    resignationDateReceived: isoDateString,
    resignationMethod: z.nativeEnum(ResignationMethod),
    removalNotes: z.string().trim().max(1000).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.resignationReason === "OTHER" &&
      (data.removalNotes ?? "").trim() === ""
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Notes are required when reason is Other",
        path: ["removalNotes"],
      });
    }
  });

// Handle committee membership request data validation schema (SRS 1.2 — uses CommitteeMembership)
export const handleCommitteeRequestDataSchema = z
  .object({
    membershipId: z.string().min(1, "Membership ID is required"),
    acceptOrReject: z.enum(["accept", "reject"], {
      errorMap: () => ({
        message: "Accept or reject must be either 'accept' or 'reject'",
      }),
    }),
    meetingRecordId: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v == null || v === "" ? undefined : v)),
    // SRS §2.1 — Admin override (accept path only; honored only when user is Admin)
    forceAdd: z.boolean().optional(),
    overrideReason: z.string().trim().max(500).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.acceptOrReject === "accept" && !data.meetingRecordId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "meetingRecordId is required when accepting a membership request",
        path: ["meetingRecordId"],
      });
    }
  });

// Update LTED weight (SRS 1.4)
export const updateLtedWeightSchema = z
  .object({
    committeeListId: z.coerce.number().int().positive(),
    ltedWeight: z
      .number()
      .finite("LTED weight must be a finite number")
      .nonnegative("LTED weight must be non-negative")
      .nullable(),
  })
  .strict();

// SRS 2.6 — Record petition/primary outcome (admin)
const petitionOutcomeEnum = z.enum([
  "WON_PRIMARY",
  "LOST_PRIMARY",
  "TIE",
  "UNOPPOSED",
]);
export const recordPetitionOutcomeSchema = z
  .object({
    committeeListId: z.coerce.number().int().positive(),
    termId: z.string().trim().min(1).optional(),
    seatNumber: z.coerce.number().int().positive(),
    primaryDate: z
      .string()
      .trim()
      .min(1, "Primary date is required")
      .refine(
        (s) => !Number.isNaN(new Date(s).getTime()),
        { message: "Primary date must be a valid ISO date" },
      ),
    candidates: z
      .array(
        z.object({
          voterRecordId: z.string().trim().min(1, "Voter record ID is required"),
          voteCount: z.coerce.number().int().nonnegative().optional(),
          outcome: petitionOutcomeEnum,
        }),
      )
      .min(1, "At least one candidate is required"),
  })
  .strict()
  .superRefine((data, ctx) => {
    const ids = data.candidates.map((c) => c.voterRecordId);
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate candidate voterRecordId in payload",
          path: ["candidates"],
        });
        return;
      }
      seen.add(id);
    }
    const winners = data.candidates.filter(
      (c) => c.outcome === "WON_PRIMARY" || c.outcome === "UNOPPOSED",
    );
    const ties = data.candidates.filter((c) => c.outcome === "TIE");
    if (ties.length === data.candidates.length) {
      return; // tie-only scenario: no winner required
    }
    if (winners.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Exactly one winner (WON_PRIMARY or UNOPPOSED) is required unless all candidates are TIE",
        path: ["candidates"],
      });
    }
  });

export type RecordPetitionOutcomeData = z.infer<
  typeof recordPetitionOutcomeSchema
>;

// SRS 2.6 — List petition outcomes query (filter by petition outcome statuses)
export const getPetitionOutcomesQuerySchema = z
  .object({
    termId: z.string().trim().min(1).optional(),
    committeeListId: z.coerce.number().int().positive().optional(),
    status: z
      .enum(["ACTIVE", "PETITIONED_LOST", "PETITIONED_TIE"])
      .optional(),
  })
  .strict();

export type GetPetitionOutcomesQuery = z.infer<
  typeof getPetitionOutcomesQuerySchema
>;

// Fetch committee list query parameters validation schema
export const fetchCommitteeListQuerySchema = z
  .object({
    cityTown: z.string().trim().min(1, "City/Town is required"),
    legDistrict: z
      .string()
      .trim()
      .transform((v) => (v === "" ? undefined : v))
      .optional()
      .refine(
        (val) => {
          if (val === undefined) return true;
          const parsed = Number(val);
          return Number.isInteger(parsed) && parsed > 0;
        },
        {
          message:
            "Legislative District must be a positive integer when provided",
        },
      ),
    electionDistrict: z
      .string()
      .trim()
      .regex(/^\d+$/, "Election District must contain only digits"),
    // SRS 2.7 — include designation-weight summary payload when needed.
    includeDesignationWeightSummary: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v == null ? undefined : v.toLowerCase()))
      .refine((v) => v == null || v === "true" || v === "false", {
        message:
          "includeDesignationWeightSummary must be 'true' or 'false' when provided",
      })
      .transform((v) => (v == null ? undefined : v === "true")),
  })
  .strict();

// API Response types for committee operations (SRS §2.1 + §2.2)
export type AddCommitteeResponse =
  | {
      success: true;
      message: string;
      idempotent?: true;
      /** SRS §2.2 — Non-blocking warnings; frontend renders only server-returned warnings. */
      warnings?: EligibilityWarning[];
    }
  | { success: false; error: string }
  | {
      success: false;
      error: "INELIGIBLE";
      reasons: IneligibilityReason[];
    };

export type CommitteeRequestResponse =
  | {
      success: true;
      message: string;
      /** SRS §2.2 — Non-blocking warnings. */
      warnings?: EligibilityWarning[];
    }
  | { success: false; error: string };

// Type exports derived from schemas
export type CommitteeData = z.infer<typeof committeeDataSchema>;
export type RemoveCommitteeData = z.infer<typeof removeCommitteeDataSchema>;
export type ResignCommitteeData = z.infer<typeof resignCommitteeDataSchema>;
export type CommitteeRequestData = z.infer<typeof committeeRequestDataSchema>;
export type HandleCommitteeRequestData = z.infer<
  typeof handleCommitteeRequestDataSchema
>;
export type FetchCommitteeListQuery = z.infer<
  typeof fetchCommitteeListQuerySchema
>;

// ---------------------------------------------------------------------------
// SRS 2.4 — Meeting Record + Bulk Decision schemas
// ---------------------------------------------------------------------------

/** Valid ISO date string (reused from resignCommitteeDataSchema). */
const meetingIsoDateString = z
  .string()
  .trim()
  .min(1, "Meeting date is required")
  .refine(
    (s) => !Number.isNaN(new Date(s).getTime()),
    { message: "Meeting date must be a valid date" },
  );

export const createMeetingSchema = z
  .object({
    meetingDate: meetingIsoDateString,
    meetingType: z.nativeEnum(MeetingType).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export type CreateMeetingData = z.infer<typeof createMeetingSchema>;

export const bulkDecisionSchema = z
  .object({
    decisions: z
      .array(
        z.object({
          membershipId: z.string().trim().min(1, "Membership ID is required"),
          decision: z.enum(["confirm", "reject"]),
          rejectionNote: z.string().trim().max(1000).optional(),
        }),
      )
      .min(1, "At least one decision is required"),
  })
  .strict()
  .superRefine((data, ctx) => {
    const ids = data.decisions.map((d) => d.membershipId);
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate membershipId in decisions",
          path: ["decisions"],
        });
        return;
      }
      seen.add(id);
    }
  });

export type BulkDecisionData = z.infer<typeof bulkDecisionSchema>;

// SRS 2.7 — Designation weight query params
export const designationWeightQuerySchema = z
  .object({
    committeeListId: z.coerce.number().int().positive(),
    termId: z.string().trim().min(1).optional(),
  })
  .strict();

export type DesignationWeightQuery = z.infer<
  typeof designationWeightQuerySchema
>;

// SRS 3.1 — Assign jurisdiction (POST body)
export const assignJurisdictionSchema = z
  .object({
    userId: z.string().trim().min(1, "userId is required"),
    cityTown: z.string().trim().min(1, "cityTown is required"),
    legDistrict: z.coerce
      .number()
      .int()
      .optional()
      .refine((val) => val === undefined || val > 0, {
        message: "Legislative District must be a positive integer when provided",
      }),
    termId: z.string().trim().min(1, "termId is required"),
  })
  .strict();

export type AssignJurisdictionData = z.infer<typeof assignJurisdictionSchema>;

// SRS 3.1 — A single jurisdiction captured at Leader invite time (no userId yet —
// the user does not exist until they accept the invite and sign in for the first time).
export const inviteJurisdictionSchema = z
  .object({
    cityTown: z.string().trim().min(1, "cityTown is required"),
    legDistrict: z.coerce
      .number()
      .int()
      .optional()
      .refine((val) => val === undefined || val > 0, {
        message: "Legislative District must be a positive integer when provided",
      }),
    termId: z.string().trim().min(1, "termId is required"),
  })
  .strict();

export type InviteJurisdictionData = z.infer<typeof inviteJurisdictionSchema>;

// SRS 3.1 — List jurisdictions query (GET ?userId=&termId=). Requires at least one filter.
export const listJurisdictionsQuerySchema = z
  .object({
    userId: z.string().trim().min(1).optional(),
    termId: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((q) => q.userId != null || q.termId != null, {
    message: "At least one of userId or termId is required",
  });

export type ListJurisdictionsQuery = z.infer<
  typeof listJurisdictionsQuerySchema
>;
// ---------------------------------------------------------------------------
// Committee Roster View — seat roster + grid read model (GET /api/committee/roster)
// See docs/COMMITTEE_ROSTER_VIEW.md and
// docs/SRS/COMMITTEES_WORKSPACE_UI_IMPLEMENTATION_PLAN.md §5 "Grid".
// ---------------------------------------------------------------------------

/** City whose committees span multiple legislative districts; legDistrict is required. */
export const ROCHESTER_CITY = "ROCHESTER";

/** Page size when `limit` is omitted. Sized so a single town fits in one page. */
export const ROSTER_DEFAULT_LIMIT = 200;
/** Hard ceiling on `limit`; larger values are rejected with 400. */
export const ROSTER_MAX_LIMIT = 500;

/** Empty string → undefined so `?legDistrict=` behaves like an omitted param. */
const emptyToUndefined = (v: string) => (v === "" ? undefined : v);

/** Optional positive-integer query param (arrives as a string). */
function positiveIntQueryParam(message: string) {
  return z
    .string()
    .trim()
    .transform(emptyToUndefined)
    .optional()
    .refine(
      (val) => {
        if (val === undefined) return true;
        const parsed = Number(val);
        return Number.isInteger(parsed) && parsed > 0;
      },
      { message },
    )
    .transform((val) => (val === undefined ? undefined : Number(val)));
}

/**
 * Roster query params.
 *
 * - `cityTown` optional: omitted → every committee in the caller's scope
 *   (all towns for Admin; the caller's jurisdictions for Leader).
 * - `legDistrict` required only when `cityTown` is Rochester.
 * - `cursor` is the `committeeListId` of the last rollup on the previous page
 *   (echoed back as `nextCursor`); `limit` is the page size.
 * - `includeRows=false` omits per-seat `rows` (grid mode).
 */
export const rosterQuerySchema = z
  .object({
    cityTown: z.string().trim().transform(emptyToUndefined).optional(),
    legDistrict: positiveIntQueryParam(
      "Legislative District must be a positive integer when provided",
    ),
    cursor: positiveIntQueryParam(
      "cursor must be a positive integer when provided",
    ),
    limit: positiveIntQueryParam("limit must be a positive integer when provided")
      .refine((val) => val === undefined || val <= ROSTER_MAX_LIMIT, {
        message: `limit must be at most ${String(ROSTER_MAX_LIMIT)}`,
      })
      .transform((val) => val ?? ROSTER_DEFAULT_LIMIT),
    includeRows: z
      .string()
      .trim()
      .transform(emptyToUndefined)
      .optional()
      .refine((val) => val === undefined || val === "true" || val === "false", {
        message: "includeRows must be true or false when provided",
      })
      .transform((val) => val !== "false"),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.cityTown !== undefined &&
      data.cityTown.toUpperCase() === ROCHESTER_CITY &&
      data.legDistrict === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Legislative District is required for Rochester",
        path: ["legDistrict"],
      });
    }
  });

export type RosterQuery = z.infer<typeof rosterQuerySchema>;

/** Present iff Admin (see the `includeContact` policy in the roster route). */
export const rosterContactSchema = z.object({
  email: z.string().nullable(),
  phone: z.string().nullable(),
});

export type RosterContact = z.infer<typeof rosterContactSchema>;

/** One row per seat (occupied or vacant) plus extra rows for unassigned members. */
export const seatRosterRowSchema = z.object({
  committeeListId: z.number().int(),
  cityTown: z.string(),
  legDistrict: z.number().int(),
  electionDistrict: z.number().int(),
  /** null only for unassigned rows */
  seatNumber: z.number().int().nullable(),
  isPetitioned: z.boolean(),
  /** Decimal serialized */
  weight: z.string().nullable(),
  unassigned: z.boolean().optional(),
  /** vacant AND isPetitioned */
  petitionedVacant: z.boolean().optional(),
  occupant: z
    .object({
      VRCNUM: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      membershipType: z.nativeEnum(MembershipType).nullable(),
    })
    .nullable(),
  contact: rosterContactSchema.optional(),
});

export type SeatRosterRow = z.infer<typeof seatRosterRowSchema>;

/**
 * Per-committee (ED) rollup — one grid row. Carries both `committeeListId`
 * and the composite key `(cityTown, legDistrict, electionDistrict)` so action
 * adapters can call the composite-keyed mutation endpoints without a lookup
 * (plan §3.11).
 */
export const edRollupSchema = z.object({
  committeeListId: z.number().int(),
  cityTown: z.string(),
  legDistrict: z.number().int(),
  electionDistrict: z.number().int(),
  /** seats OCCUPIED (distinct seatNumbers with an active occupant) */
  filled: z.number().int(),
  totalSeats: z.number().int(),
  /** active members with no seatNumber (not counted in `filled`) */
  unassignedCount: z.number().int(),
  /** SUBMITTED memberships awaiting review in the active term */
  pendingCount: z.number().int(),
  designationWeight: z.number().nullable(),
  /** petitioned seats lacking weight — render "—" */
  missingWeightSeatNumbers: z.array(z.number().int()),
});

export type EdRollup = z.infer<typeof edRollupSchema>;

/** Scope-wide totals: every committee matching the request, not just the page. */
export const rosterSummarySchema = z.object({
  totalSeats: z.number().int(),
  /** seats OCCUPIED, not active-member count */
  filled: z.number().int(),
  /** open seats */
  vacant: z.number().int(),
  edCount: z.number().int(),
  /** active members with no seat */
  unassignedCount: z.number().int(),
  /** SUBMITTED memberships awaiting review */
  pendingCount: z.number().int(),
  /** ACTIVE memberships (seated + unassigned) */
  activeMemberCount: z.number().int(),
});

export type RosterSummary = z.infer<typeof rosterSummarySchema>;

/** Filter values available in the caller's base scope (before `cityTown`/`legDistrict` narrowing). */
export const rosterFiltersSchema = z.object({
  towns: z.array(z.string()),
  legDistricts: z.array(
    z.object({ cityTown: z.string(), legDistrict: z.number().int() }),
  ),
});

export type RosterFilters = z.infer<typeof rosterFiltersSchema>;

export const rosterResponseSchema = z.object({
  scope: z.object({
    cityTown: z.string().optional(),
    legDistrict: z.number().int().optional(),
  }),
  filters: rosterFiltersSchema,
  /** Omitted when `includeRows=false`. */
  rows: z.array(seatRosterRowSchema).optional(),
  /** One page of rollups, ordered by (cityTown, legDistrict, electionDistrict). */
  edRollups: z.array(edRollupSchema),
  summary: rosterSummarySchema,
  /** `committeeListId` to pass as `cursor` for the next page; null on the last page. */
  nextCursor: z.number().int().nullable(),
});

export type RosterResponse = z.infer<typeof rosterResponseSchema>;

// ---------------------------------------------------------------------------
// Committee detail — GET /api/committee/[committeeListId]/detail
// See docs/SRS/COMMITTEES_WORKSPACE_UI_IMPLEMENTATION_PLAN.md §5 "Detail" and
// .scratch/committees-workspace/history-inventory.md §4 (history shape).
// ---------------------------------------------------------------------------

/** Route params: the `[committeeListId]` path segment arrives as a string. */
export const committeeDetailParamsSchema = z
  .object({
    committeeListId: z
      .string()
      .trim()
      .regex(/^\d+$/, "committeeListId must be a positive integer")
      .transform(Number)
      .pipe(z.number().int().positive("committeeListId must be a positive integer")),
  })
  .strict();

export type CommitteeDetailParams = z.infer<typeof committeeDetailParamsSchema>;

/** How many history events the detail response carries; `hasMore` flags overflow. */
export const COMMITTEE_DETAIL_HISTORY_LIMIT = 50;

/** SRS 2.7 — per-seat designation-weight breakdown (shared-prisma `DesignationWeightResult`). */
export const designationWeightSummarySchema = z.object({
  totalWeight: z.number(),
  totalContributingSeats: z.number().int(),
  seats: z.array(
    z.object({
      seatNumber: z.number().int(),
      isPetitioned: z.boolean(),
      isOccupied: z.boolean(),
      occupantMembershipType: z.nativeEnum(MembershipType).nullable(),
      seatWeight: z.number().nullable(),
      contributes: z.boolean(),
      contributionWeight: z.number(),
    }),
  ),
  missingWeightSeatNumbers: z.array(z.number().int()),
});

export type DesignationWeightSummary = z.infer<
  typeof designationWeightSummarySchema
>;

/** A voter named in a detail response: VRCNUM + name (Leader-visible, like roster occupants). */
const detailVoterSchema = z.object({
  voterRecordId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

/**
 * A SUBMITTED membership awaiting review. Leaders in jurisdiction see who was
 * submitted, when, and whom they would replace; the submitter's identity,
 * request notes, eligibility warnings and contact are Admin-only.
 */
export const pendingMembershipSchema = detailVoterSchema.extend({
  membershipId: z.string(),
  submittedAt: z.string(),
  /** true when the caller is the submitter (Leaders can recognise their own requests). */
  isOwnSubmission: z.boolean(),
  /** From `submissionMetadata.removeMemberId`; null when the request is a plain add. */
  replacementFor: detailVoterSchema.nullable(),
  /** Admin only. */
  submittedBy: z.object({ id: z.string(), name: z.string().nullable() }).optional(),
  /** Admin only — free text entered by the requester. */
  requestNotes: z.string().optional(),
  /** Admin only — SRS §2.2 warning snapshot at submission time. */
  eligibilityWarnings: z.array(z.unknown()).optional(),
  /** Admin only — `submissionMetadata` contact, falling back to the voter record. */
  contact: rosterContactSchema.optional(),
});

export type PendingMembership = z.infer<typeof pendingMembershipSchema>;

/** SRS 2.6 — one petition candidate as `/api/admin/petition-outcomes` lists it (Admin-only). */
export const petitionOutcomeContextSchema = z.object({
  id: z.string(),
  voterRecordId: z.string(),
  voter: z
    .object({
      VRCNUM: z.string(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
    })
    .nullable(),
  seatNumber: z.number().int().nullable(),
  petitionSeatNumber: z.number().int().nullable(),
  /** Outcome (ACTIVE / PETITIONED_LOST / PETITIONED_TIE), or the current status if the member since left. */
  status: z.nativeEnum(MembershipStatus),
  petitionPrimaryDate: z.string().nullable(),
  petitionVoteCount: z.number().int().nullable(),
});

export type PetitionOutcomeContext = z.infer<typeof petitionOutcomeContextSchema>;

// --- History (inventory §4) --------------------------------------------------

/** Who acted. Role for every reader; the staff member's name is Admin-only. */
export const historyActorSchema = z.object({
  role: z.nativeEnum(PrivilegeLevel),
  name: z.string().nullable().optional(),
});

/** Whom the event is about. Name at jurisdiction scope (roster policy); id Admin-only. */
export const historyMemberSchema = z.object({
  name: z.string(),
  seatNumber: z.number().int().nullable(),
  voterRecordId: z.string().optional(),
});

/** Present only when the event's `meetingRecordId` resolved; `notes` Admin-only. */
export const historyMeetingSchema = z.object({
  id: z.string(),
  meetingDate: z.string(),
  meetingType: z.nativeEnum(MeetingType),
  notes: z.string().nullable().optional(),
});

/**
 * Provenance, from `AuditLog.metadata.source`; "meeting" when the event carries
 * a meeting; "manual" when absent; "other" for a source value this build does
 * not know, or one withheld from the reader ("petition_outcome" is Admin-only;
 * a Leader sees a petition-win activation with source "other").
 */
export const historySourceSchema = z.enum([
  "manual",
  "meeting",
  "petition_outcome",
  "bulk_import_sync",
  "boe_flagging",
  "discrepancy_accept",
  "discrepancy_undo",
  "other",
]);

export type HistorySource = z.infer<typeof historySourceSchema>;

const historyEventBase = {
  /** AuditLog.id */
  id: z.string(),
  /** AuditLog.timestamp, ISO */
  at: z.string(),
  actor: historyActorSchema,
  member: historyMemberSchema,
  source: historySourceSchema,
};

/**
 * One membership-history event. Fields marked Admin-only are omitted (not
 * nulled) for Leaders; see the privilege matrix in the history inventory §4.
 */
export const historyEventSchema = z.discriminatedUnion("kind", [
  z.object({
    ...historyEventBase,
    kind: z.literal("submitted"),
    /** Admin only. */
    requestNotes: z.string().optional(),
    /** Admin only — the member this submission intends to replace. */
    replacementFor: historyMemberSchema.optional(),
  }),
  z.object({
    ...historyEventBase,
    kind: z.literal("rejected"),
    meeting: historyMeetingSchema.optional(),
    /** Admin only. */
    rejectionNote: z.string().nullable().optional(),
    /** Admin only — set when the system rejected for capacity, not a person. */
    systemReason: z.literal("capacity").optional(),
  }),
  z.object({
    ...historyEventBase,
    kind: z.literal("confirmed"),
    /** Always written on accept; optional only because a MeetingRecord could be missing. */
    meeting: historyMeetingSchema.optional(),
    membershipType: z.nativeEnum(MembershipType).nullable(),
  }),
  z.object({
    ...historyEventBase,
    kind: z.literal("activated"),
    membershipType: z.nativeEnum(MembershipType).nullable().optional(),
    /** Admin only. */
    overrideReason: z.string().optional(),
    /** Admin only. */
    eligibilityWarnings: z.array(z.unknown()).optional(),
  }),
  z.object({
    ...historyEventBase,
    kind: z.literal("resigned"),
    /** `resignationDateReceived`, ISO. */
    effectiveDate: z.string().optional(),
    /** Admin only. */
    method: z.nativeEnum(ResignationMethod).optional(),
    /** Admin only. */
    reason: z.nativeEnum(RemovalReason).optional(),
    /** Admin only. */
    notes: z.string().optional(),
  }),
  z.object({
    ...historyEventBase,
    kind: z.literal("removed"),
    /** Admin only. */
    reason: z.nativeEnum(RemovalReason).optional(),
    /** Admin only. */
    notes: z.string().optional(),
    /** Admin only — the incoming member of an accepted replacement request. */
    replacedBy: historyMemberSchema.optional(),
  }),
  /** Admin only — the whole event is omitted for non-Admins. */
  z.object({
    ...historyEventBase,
    kind: z.literal("petition_outcome"),
    outcome: z.enum(["won", "lost", "tie"]),
    seatNumber: z.number().int().nullable(),
    primaryDate: z.string().nullable(),
    voteCount: z.number().int().nullable(),
    /** Set when a discrepancy undo restored this outcome; not a fresh result. */
    reversed: z.literal(true).optional(),
  }),
]);

export type HistoryEvent = z.infer<typeof historyEventSchema>;
export type HistoryEventKind = HistoryEvent["kind"];

export const committeeDetailResponseSchema = z.object({
  /** Identity: `committeeListId` for URLs/actions plus the composite key for adapters (plan §3.11). */
  committee: z.object({
    committeeListId: z.number().int(),
    cityTown: z.string(),
    legDistrict: z.number().int(),
    electionDistrict: z.number().int(),
    termId: z.string(),
    /** SRS §8.1 — Decimal serialized; null until known. */
    ltedWeight: z.string().nullable(),
    /** From the LTED crosswalk, trimmed; null when the committee's ED has no crosswalk entry. */
    assemblyDistrict: z.string().nullable(),
  }),
  term: z.object({
    id: z.string(),
    label: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  }),
  maxSeatsPerLted: z.number().int(),
  /** Governance config: whether residency (the committee's AD) is checked at all. */
  requireAssemblyDistrictMatch: z.boolean(),
  /** Same rollup the grid shows for this committee (ticket 05's builder). */
  rollup: edRollupSchema,
  /** One row per seat plus unassigned rows; `contact` present iff Admin. */
  rows: z.array(seatRosterRowSchema),
  designationWeightSummary: designationWeightSummarySchema,
  /** SUBMITTED memberships in the active term, oldest first. */
  pending: z.array(pendingMembershipSchema),
  /** Admin only — omitted for Leaders. */
  petitionContext: z.array(petitionOutcomeContextSchema).optional(),
  history: z.object({
    /** Newest first, capped at COMMITTEE_DETAIL_HISTORY_LIMIT. */
    events: z.array(historyEventSchema),
    hasMore: z.boolean(),
  }),
});

export type CommitteeDetailResponse = z.infer<
  typeof committeeDetailResponseSchema
>;
