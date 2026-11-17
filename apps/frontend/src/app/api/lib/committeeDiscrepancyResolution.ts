import {
  type AuditAction,
  type CommitteeMembership,
  type DiscrepancyResolution,
  type Prisma,
} from "@prisma/client";
import type { MembershipExit } from "~/app/api/lib/membershipExit";

export type MembershipOutcome = "created" | "reactivated" | "none";

export type MembershipSnapshot = {
  status: CommitteeMembership["status"];
  seatNumber: number | null;
  activatedAt: string | null;
};

export type MembershipBeforeSnapshot = {
  status: CommitteeMembership["status"];
  membershipType: CommitteeMembership["membershipType"];
  seatNumber: number | null;
  activatedAt: string | null;
  confirmedAt: string | null;
  resignedAt: string | null;
  removedAt: string | null;
  rejectedAt: string | null;
  rejectionNote: string | null;
  resignationDateReceived: string | null;
  resignationMethod: CommitteeMembership["resignationMethod"];
  removalReason: CommitteeMembership["removalReason"];
  removalNotes: string | null;
  petitionVoteCount: number | null;
  petitionPrimaryDate: string | null;
};

export type ResolutionMetadata = {
  membershipOutcome: MembershipOutcome;
  membershipId?: string | null;
  membershipBefore?: MembershipBeforeSnapshot;
  membershipAfter?: MembershipSnapshot;
  addressBefore?: string | null;
  addressAfter?: string;
};

export type DiscrepancyDecisionMetadata = {
  VRCNUM: string;
  committeeId: number;
  termId: string;
  discrepancy: Prisma.JsonValue;
  resolution: DiscrepancyResolution;
  membershipOutcome: MembershipOutcome;
  membershipId?: string | null;
  membershipBefore?: MembershipBeforeSnapshot;
  membershipAfter?: MembershipSnapshot;
  addressBefore?: string | null;
  addressAfter?: string;
  addressRestoreSkipped?: boolean;
};

/** Serializes a Date to ISO string for JSON metadata storage. */
function toIsoString(value: Date | null | undefined): string | null {
  return value != null ? value.toISOString() : null;
}

/** Captures the full membership field set that accept/reactivate overwrites. */
export function snapshotMembershipBefore(
  membership: CommitteeMembership,
): MembershipBeforeSnapshot {
  return {
    status: membership.status,
    membershipType: membership.membershipType,
    seatNumber: membership.seatNumber,
    activatedAt: toIsoString(membership.activatedAt),
    confirmedAt: toIsoString(membership.confirmedAt),
    resignedAt: toIsoString(membership.resignedAt),
    removedAt: toIsoString(membership.removedAt),
    rejectedAt: toIsoString(membership.rejectedAt),
    rejectionNote: membership.rejectionNote,
    resignationDateReceived: toIsoString(membership.resignationDateReceived),
    resignationMethod: membership.resignationMethod,
    removalReason: membership.removalReason,
    removalNotes: membership.removalNotes,
    petitionVoteCount: membership.petitionVoteCount,
    petitionPrimaryDate: toIsoString(membership.petitionPrimaryDate),
  };
}

/** Captures post-resolve membership guard fields. */
export function snapshotMembershipAfter(
  membership: Pick<
    CommitteeMembership,
    "status" | "seatNumber" | "activatedAt"
  >,
): MembershipSnapshot {
  return {
    status: membership.status,
    seatNumber: membership.seatNumber,
    activatedAt: toIsoString(membership.activatedAt),
  };
}

/** Returns true when current membership still matches the resolved snapshot. */
export function membershipMatchesAfter(
  current: Pick<
    CommitteeMembership,
    "status" | "seatNumber" | "activatedAt"
  > | null,
  expected: MembershipSnapshot,
): boolean {
  if (current == null) {
    return false;
  }

  return (
    current.status === expected.status &&
    current.seatNumber === expected.seatNumber &&
    toIsoString(current.activatedAt) === expected.activatedAt
  );
}

/** Builds durable decision-event metadata for audit logging. */
export function buildDecisionMetadata(params: {
  VRCNUM: string;
  committeeId: number;
  termId: string;
  discrepancy: Prisma.JsonValue;
  resolution: DiscrepancyResolution;
  resolutionMetadata: ResolutionMetadata;
  addressRestoreSkipped?: boolean;
}): DiscrepancyDecisionMetadata {
  const { resolutionMetadata, ...rest } = params;
  return {
    ...rest,
    membershipOutcome: resolutionMetadata.membershipOutcome,
    membershipId: resolutionMetadata.membershipId ?? null,
    membershipBefore: resolutionMetadata.membershipBefore,
    membershipAfter: resolutionMetadata.membershipAfter,
    addressBefore: resolutionMetadata.addressBefore,
    addressAfter: resolutionMetadata.addressAfter,
  };
}

/** Maps restored membership status to compensating audit action on undo. */
export function compensatingAuditActionForStatus(
  status: CommitteeMembership["status"],
): AuditAction | null {
  switch (status) {
    case "REMOVED":
      return "MEMBER_REMOVED";
    case "RESIGNED":
      return "MEMBER_RESIGNED";
    case "REJECTED":
      return "MEMBER_REJECTED";
    case "SUBMITTED":
      return "MEMBER_SUBMITTED";
    case "CONFIRMED":
      return "MEMBER_CONFIRMED";
    case "PETITIONED_LOST":
    case "PETITIONED_TIE":
      return "PETITION_RECORDED";
    default:
      return null;
  }
}

function toDateOrNull(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

/**
 * How an undo writes a stored membershipBefore snapshot back. The snapshot was
 * taken before any Exit Report on the row existed, so the report fields are
 * always written back null: through `writeMembershipExit` for a saved
 * RESIGNED / REMOVED state, and `writeMembershipLeavingActive` otherwise.
 */
export type MembershipRestore =
  | { kind: "exit"; exit: MembershipExit }
  | {
      kind: "other";
      data: Prisma.CommitteeMembershipUncheckedUpdateInput;
    };

/** Converts a stored membershipBefore snapshot back to the write that restores it. */
export function membershipBeforeToRestore(
  before: MembershipBeforeSnapshot,
): MembershipRestore {
  const common = {
    membershipType: before.membershipType,
    seatNumber: before.seatNumber,
    activatedAt: toDateOrNull(before.activatedAt),
    confirmedAt: toDateOrNull(before.confirmedAt),
    rejectedAt: toDateOrNull(before.rejectedAt),
    rejectionNote: before.rejectionNote,
    petitionVoteCount: before.petitionVoteCount,
    petitionPrimaryDate: toDateOrNull(before.petitionPrimaryDate),
  };
  const exitFields = {
    resignationDateReceived: toDateOrNull(before.resignationDateReceived),
    resignationMethod: before.resignationMethod,
    removalReason: before.removalReason,
    removalNotes: before.removalNotes,
  };
  const resignedAt = toDateOrNull(before.resignedAt);
  const removedAt = toDateOrNull(before.removedAt);

  if (before.status === "RESIGNED") {
    return {
      kind: "exit",
      exit: {
        status: "RESIGNED",
        at: resignedAt,
        ...exitFields,
        extra: { ...common, removedAt },
      },
    };
  }
  if (before.status === "REMOVED") {
    return {
      kind: "exit",
      exit: {
        status: "REMOVED",
        at: removedAt,
        ...exitFields,
        extra: { ...common, resignedAt },
      },
    };
  }
  return {
    kind: "other",
    data: {
      status: before.status,
      ...common,
      resignedAt,
      removedAt,
      ...exitFields,
    },
  };
}

/** Parses resolutionMetadata JSON from a discrepancy row. */
export function parseResolutionMetadata(
  value: Prisma.JsonValue | null,
): ResolutionMetadata | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const membershipOutcome = record.membershipOutcome;
  if (
    membershipOutcome !== "created" &&
    membershipOutcome !== "reactivated" &&
    membershipOutcome !== "none"
  ) {
    return null;
  }

  return value as ResolutionMetadata;
}

/** Locks and re-reads a discrepancy row inside a transaction. */
export async function lockDiscrepancyForUpdate(
  tx: Prisma.TransactionClient,
  vrcnum: string,
) {
  await tx.$queryRaw`
    SELECT id
    FROM "CommitteeUploadDiscrepancy"
    WHERE "VRCNUM" = ${vrcnum}
    FOR UPDATE
  `;

  return tx.committeeUploadDiscrepancy.findUnique({
    where: { VRCNUM: vrcnum },
    include: {
      committee: {
        include: { term: { select: { id: true, label: true } } },
      },
    },
  });
}
