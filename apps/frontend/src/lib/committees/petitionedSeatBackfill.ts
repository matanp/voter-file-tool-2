/**
 * One-time backfill of Seat.isPetitioned for seats that were won by petition before every
 * membership write set the flag (leader-feedback-2026-11/06). The bulk import seated
 * PETITIONED members without flagging their seats, so the Vacancy and Weight reports saw
 * no petitioned seats.
 *
 * One petition win flags one seat: each petitioned membership flags at most one seat for
 * the term, the first seat it won, taken from the first of these that names one:
 *  - petition: its petitionSeatNumber (a recorded outcome it won; a membership the outcome
 *    left PETITIONED_LOST or PETITIONED_TIE won nothing);
 *  - audit: its earliest MEMBER_ACTIVATED audit row that seated it as PETITIONED. Bulk
 *    removal and replacement null a membership's seatNumber, so the audit log is the
 *    only record of where a petitioned member who has since left was seated;
 *  - membership: its current seatNumber, when it is PETITIONED.
 * Other seats the same membership held later (a returning member reseated elsewhere) are
 * counted as passed over, never flagged.
 *
 * Idempotent: only unflagged seats change, and a rerun finds nothing to do. Already-flagged
 * seats are never unflagged. Run the preview first (scripts/backfillPetitionedSeats.ts
 * without --apply).
 */

import type { PrismaClient, Prisma, PrivilegeLevel } from "@prisma/client";
// Relative, not ~/: scripts/backfillPetitionedSeats.ts imports this module directly.
import { logAuditEventsOrThrow } from "../auditLog";

/** `metadata.source` on the backfill's SEAT_PETITIONED_BACKFILLED audit rows. */
export const PETITIONED_SEAT_BACKFILL_SOURCE = "petitioned_seat_backfill";

export type PetitionedSeatSource = "membership" | "petition" | "audit";

export type PetitionedSeatCandidate = {
  seatId: string;
  committeeListId: number;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  seatNumber: number;
  alreadyPetitioned: boolean;
  sources: PetitionedSeatSource[];
};

export type PetitionedSeatBackfillPreview = {
  termId: string;
  /** Every seat some petitioned membership's first seat is, flagged or not. */
  candidates: PetitionedSeatCandidate[];
  /** Candidates whose flag is still false: what --apply would change. */
  toFlag: PetitionedSeatCandidate[];
  /** First seats with no Seat row; reported, never created. */
  missingSeats: Array<{
    committeeListId: number;
    seatNumber: number;
    sources: PetitionedSeatSource[];
  }>;
  summary: {
    /** Memberships with any petitioned-seat evidence for the term. */
    petitionedMemberships: number;
    petitionedSeats: number;
    alreadyPetitioned: number;
    toFlag: number;
    committees: number;
    maxPerCommittee: number;
    /** Seats chosen per source (a seat several memberships chose counts once per source). */
    bySource: Record<PetitionedSeatSource, number>;
    /**
     * Seats a petitioned membership also held, but not as its first seat, and no
     * membership chose: left as they are.
     */
    passedOverSeats: number;
  };
};

type Db = Pick<PrismaClient, "$queryRaw"> | Prisma.TransactionClient;

type EvidenceRow = {
  membershipId: string;
  committeeListId: number;
  seatNumber: number;
  source: PetitionedSeatSource;
  /** When the audit row was written; null for the membership's own columns. */
  at: Date | null;
};

const SOURCE_PRIORITY: Record<PetitionedSeatSource, number> = {
  petition: 0,
  audit: 1,
  membership: 2,
};

async function findEvidenceRows(db: Db, termId: string): Promise<EvidenceRow[]> {
  return db.$queryRaw<EvidenceRow[]>`
    SELECT m."id" AS "membershipId", m."committeeListId", m."petitionSeatNumber" AS "seatNumber",
           'petition' AS source, NULL::timestamp AS at
    FROM "CommitteeMembership" m
    WHERE m."termId" = ${termId}
      AND m."petitionSeatNumber" IS NOT NULL
      AND m."status" NOT IN ('PETITIONED_LOST', 'PETITIONED_TIE')
    UNION ALL
    SELECT m."id", m."committeeListId", (a."afterValue"->>'seatNumber')::int,
           'audit', a."timestamp"
    FROM "AuditLog" a
    JOIN "CommitteeMembership" m
      ON a."entityType" = 'CommitteeMembership' AND a."entityId" = m."id"
    WHERE m."termId" = ${termId}
      AND a."action" = 'MEMBER_ACTIVATED'
      AND jsonb_typeof(a."afterValue"->'seatNumber') = 'number'
      AND COALESCE(a."afterValue"->>'membershipType', m."membershipType"::text) = 'PETITIONED'
    UNION ALL
    SELECT m."id", m."committeeListId", m."seatNumber", 'membership', NULL::timestamp
    FROM "CommitteeMembership" m
    WHERE m."termId" = ${termId}
      AND m."membershipType" = 'PETITIONED'
      AND m."seatNumber" IS NOT NULL
  `;
}

/** Each membership's first seat: highest-priority source, earliest audit row first. */
function firstSeatPerMembership(rows: EvidenceRow[]): EvidenceRow[] {
  const first = new Map<string, EvidenceRow>();
  for (const row of rows) {
    const current = first.get(row.membershipId);
    if (!current || compareEvidence(row, current) < 0) {
      first.set(row.membershipId, row);
    }
  }
  return Array.from(first.values());
}

function compareEvidence(a: EvidenceRow, b: EvidenceRow): number {
  const bySource = SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source];
  if (bySource !== 0) return bySource;
  return (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0);
}

export async function previewPetitionedSeatBackfill(
  db: Db,
  termId: string,
): Promise<PetitionedSeatBackfillPreview> {
  const evidenceRows = await findEvidenceRows(db, termId);
  const sourceRows = firstSeatPerMembership(evidenceRows);

  const seatKey = (seat: { committeeListId: number; seatNumber: number }) =>
    `${seat.committeeListId}:${seat.seatNumber}`;

  // One entry per chosen seat, keeping its ids alongside every source that chose it.
  const namedSeats = new Map<
    string,
    {
      committeeListId: number;
      seatNumber: number;
      sources: Set<PetitionedSeatSource>;
    }
  >();
  for (const row of sourceRows) {
    const key = seatKey(row);
    const named = namedSeats.get(key) ?? {
      committeeListId: row.committeeListId,
      seatNumber: row.seatNumber,
      sources: new Set<PetitionedSeatSource>(),
    };
    named.sources.add(row.source);
    namedSeats.set(key, named);
  }
  const passedOverSeats = new Set(
    evidenceRows.map(seatKey).filter((key) => !namedSeats.has(key)),
  ).size;

  const committeeIds = Array.from(
    new Set(sourceRows.map((row) => row.committeeListId)),
  );
  const seats =
    committeeIds.length === 0
      ? []
      : await db.$queryRaw<
          Array<{
            id: string;
            committeeListId: number;
            seatNumber: number;
            isPetitioned: boolean;
            cityTown: string;
            legDistrict: number;
            electionDistrict: number;
          }>
        >`
          SELECT s."id", s."committeeListId", s."seatNumber", s."isPetitioned",
                 c."cityTown", c."legDistrict", c."electionDistrict"
          FROM "Seat" s
          JOIN "CommitteeList" c ON c."id" = s."committeeListId"
          WHERE s."termId" = ${termId}
            AND s."committeeListId" = ANY(${committeeIds})
        `;

  const seatByKey = new Map(seats.map((seat) => [seatKey(seat), seat]));

  const sourceOrder: PetitionedSeatSource[] = [
    "membership",
    "petition",
    "audit",
  ];
  const candidates: PetitionedSeatCandidate[] = [];
  const missingSeats: PetitionedSeatBackfillPreview["missingSeats"] = [];
  for (const [key, named] of namedSeats) {
    const sources = sourceOrder.filter((source) => named.sources.has(source));
    const seat = seatByKey.get(key);
    if (!seat) {
      missingSeats.push({
        committeeListId: named.committeeListId,
        seatNumber: named.seatNumber,
        sources,
      });
      continue;
    }
    candidates.push({
      seatId: seat.id,
      committeeListId: seat.committeeListId,
      cityTown: seat.cityTown,
      legDistrict: seat.legDistrict,
      electionDistrict: seat.electionDistrict,
      seatNumber: seat.seatNumber,
      alreadyPetitioned: seat.isPetitioned,
      sources,
    });
  }

  candidates.sort(
    (a, b) =>
      a.cityTown.localeCompare(b.cityTown) ||
      a.legDistrict - b.legDistrict ||
      a.electionDistrict - b.electionDistrict ||
      a.seatNumber - b.seatNumber,
  );
  missingSeats.sort(
    (a, b) =>
      a.committeeListId - b.committeeListId || a.seatNumber - b.seatNumber,
  );

  const perCommittee = new Map<number, number>();
  for (const candidate of candidates) {
    perCommittee.set(
      candidate.committeeListId,
      (perCommittee.get(candidate.committeeListId) ?? 0) + 1,
    );
  }
  const bySource: Record<PetitionedSeatSource, number> = {
    membership: 0,
    petition: 0,
    audit: 0,
  };
  for (const candidate of candidates) {
    for (const source of candidate.sources) bySource[source] += 1;
  }
  const toFlag = candidates.filter((candidate) => !candidate.alreadyPetitioned);

  return {
    termId,
    candidates,
    toFlag,
    missingSeats,
    summary: {
      petitionedMemberships: sourceRows.length,
      petitionedSeats: candidates.length,
      alreadyPetitioned: candidates.length - toFlag.length,
      toFlag: toFlag.length,
      committees: perCommittee.size,
      maxPerCommittee: Math.max(0, ...perCommittee.values()),
      bySource,
      passedOverSeats,
    },
  };
}

export type BackfillActor = { userId: string; userRole: PrivilegeLevel };

/**
 * Flags every seat the preview finds unflagged, and writes one SEAT_PETITIONED_BACKFILLED
 * audit row per seat it changed, in one transaction. Returns the number of seats changed.
 */
export async function applyPetitionedSeatBackfill(
  prisma: PrismaClient,
  termId: string,
  actor: BackfillActor,
): Promise<{ flagged: number; preview: PetitionedSeatBackfillPreview }> {
  return prisma.$transaction(
    async (tx) => {
      // Lock the term's seats so a concurrent write can't interleave with the backfill.
      await tx.$queryRaw`
        SELECT "id" FROM "Seat" WHERE "termId" = ${termId} FOR UPDATE
      `;
      const preview = await previewPetitionedSeatBackfill(tx, termId);
      const ids = preview.toFlag.map((candidate) => candidate.seatId);
      if (ids.length === 0) return { flagged: 0, preview };

      const updated = await tx.seat.updateMany({
        where: { id: { in: ids }, isPetitioned: false },
        data: { isPetitioned: true },
      });
      if (updated.count !== ids.length) {
        throw new Error(
          `Expected to flag ${ids.length} seats, flagged ${updated.count}; rolled back`,
        );
      }

      await logAuditEventsOrThrow(
        preview.toFlag.map((candidate) => ({
          userId: actor.userId,
          userRole: actor.userRole,
          action: "SEAT_PETITIONED_BACKFILLED" as const,
          entityType: "Seat",
          entityId: candidate.seatId,
          before: { isPetitioned: false },
          after: { isPetitioned: true },
          metadata: {
            source: PETITIONED_SEAT_BACKFILL_SOURCE,
            evidence: candidate.sources,
            committeeListId: candidate.committeeListId,
            termId,
            seatNumber: candidate.seatNumber,
            cityTown: candidate.cityTown,
            legDistrict: candidate.legDistrict,
            electionDistrict: candidate.electionDistrict,
          },
        })),
        tx,
      );

      return { flagged: updated.count, preview };
    },
    { timeout: 120_000 },
  );
}
