import { z } from "zod";
// TS types below resolve after running `prisma migrate dev` or `prisma generate`.
import {
  type CommitteeList,
  type IneligibilityReason,
  type VoterRecord,
  MeetingType,
  MembershipType,
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
    resignationDateReceived: isoDateString,
    resignationMethod: z.nativeEnum(ResignationMethod),
    removalNotes: z.string().trim().max(1000).optional(),
  })
  .strict();

// Handle committee membership request data validation schema (SRS 1.2 — uses CommitteeMembership)
export const handleCommitteeRequestDataSchema = z
  .object({
    membershipId: z.string().min(1, "Membership ID is required"),
    acceptOrReject: z.enum(["accept", "reject"], {
      errorMap: () => ({
        message: "Accept or reject must be either 'accept' or 'reject'",
      }),
    }),
    // SRS §2.1 — Admin override (accept path only; honored only when user is Admin)
    forceAdd: z.boolean().optional(),
    overrideReason: z.string().trim().max(500).optional(),
  })
  .strict();

// Update LTED weight (SRS 1.4)
export const updateLtedWeightSchema = z
  .object({
    committeeListId: z.coerce.number().int().positive(),
    ltedWeight: z
      .number()
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
