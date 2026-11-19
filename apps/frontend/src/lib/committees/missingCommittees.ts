/**
 * Committees for EDs that exist in the voter file but have no CommitteeList row
 * in a term. A row is otherwise only created when the first member is added or a
 * bulk import lists the ED, so vacant EDs never appear in the committee menus.
 *
 * The voter file is the source of the ED list: it is always loaded, and its
 * town code + LD + ED agree with existing committees. ED = TOWN_CODE_TO_CITY[townCode]
 * + L_T + electionDistrict (not `city`, which is the postal city).
 */

import type { Prisma } from "@prisma/client";
import prisma from "~/lib/prisma";
import { normalizeTownCode } from "~/lib/lted/digitParsing";
import { lookupCityTown } from "~/lib/lted/monroeTownCodes";
import { seatWeightFromLted } from "~/app/api/lib/seatUtils";

export type MissingCommittee = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  voterCount: number;
};

export type MissingCommitteesResult = {
  missing: MissingCommittee[];
  /** Voter-file EDs whose town code isn't a known Monroe town; never created. */
  unknownTownCodes: string[];
};

type Db = Pick<typeof prisma, "$queryRaw" | "committeeList">;

type VoterFileEdRow = {
  townCode: string;
  legDistrict: number;
  electionDistrict: number;
  voterCount: number;
};

function committeeKey(c: {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
}): string {
  return `${c.cityTown.trim().toUpperCase()}|${c.legDistrict}|${c.electionDistrict}`;
}

/** Voter-file EDs with no CommitteeList row in `termId`, sorted by town, LD, ED. */
export async function findMissingCommittees(
  termId: string,
  db: Db = prisma,
): Promise<MissingCommitteesResult> {
  const edRows = await db.$queryRaw<VoterFileEdRow[]>`
    SELECT "townCode",
           "L_T"::int AS "legDistrict",
           "electionDistrict",
           count(*)::int AS "voterCount"
    FROM "VoterRecord"
    WHERE "townCode" IS NOT NULL
      AND "L_T" ~ '^[0-9]+$'
      AND "electionDistrict" IS NOT NULL
    GROUP BY "townCode", "L_T"::int, "electionDistrict"
  `;

  const existing = await db.committeeList.findMany({
    where: { termId },
    select: { cityTown: true, legDistrict: true, electionDistrict: true },
  });
  const existingKeys = new Set(existing.map(committeeKey));

  // Town codes may differ only in zero-padding ("5" vs "005"), so merge by
  // the resolved committee key.
  const byKey = new Map<string, MissingCommittee>();
  const unknownTownCodes = new Set<string>();
  for (const row of edRows) {
    const townCode = normalizeTownCode(row.townCode);
    const cityTown = townCode ? lookupCityTown(townCode, "strict") : null;
    if (!cityTown) {
      unknownTownCodes.add(row.townCode);
      continue;
    }
    const candidate = {
      cityTown,
      legDistrict: row.legDistrict,
      electionDistrict: row.electionDistrict,
    };
    const key = committeeKey(candidate);
    if (existingKeys.has(key)) continue;
    const prior = byKey.get(key);
    if (prior) {
      prior.voterCount += row.voterCount;
    } else {
      byKey.set(key, { ...candidate, voterCount: row.voterCount });
    }
  }

  const missing = Array.from(byKey.values()).sort(
    (a, b) =>
      a.cityTown.localeCompare(b.cityTown) ||
      a.legDistrict - b.legDistrict ||
      a.electionDistrict - b.electionDistrict,
  );

  return { missing, unknownTownCodes: Array.from(unknownTownCodes).sort() };
}

export type CreateCommitteesResult = {
  committeesCreated: number;
  seatsCreated: number;
};

/**
 * Creates a CommitteeList row and `maxSeats` empty seats for each committee.
 * Idempotent: rows or seats that already exist are skipped. Seats get the
 * committee's LTED weight when it has one.
 */
export async function createCommittees(
  tx: Prisma.TransactionClient,
  termId: string,
  committees: Array<Omit<MissingCommittee, "voterCount">>,
  maxSeats: number,
): Promise<CreateCommitteesResult> {
  if (committees.length === 0) {
    return { committeesCreated: 0, seatsCreated: 0 };
  }

  const { count: committeesCreated } = await tx.committeeList.createMany({
    data: committees.map((c) => ({
      cityTown: c.cityTown,
      legDistrict: c.legDistrict,
      electionDistrict: c.electionDistrict,
      termId,
    })),
    skipDuplicates: true,
  });

  const rows = await tx.committeeList.findMany({
    where: {
      termId,
      OR: committees.map((c) => ({
        cityTown: c.cityTown,
        legDistrict: c.legDistrict,
        electionDistrict: c.electionDistrict,
      })),
    },
    select: { id: true, ltedWeight: true },
  });

  const seatData = rows.flatMap((row) =>
    Array.from({ length: maxSeats }, (_, i) => ({
      committeeListId: row.id,
      termId,
      seatNumber: i + 1,
      isPetitioned: false,
      weight: seatWeightFromLted(row.ltedWeight),
    })),
  );
  const { count: seatsCreated } =
    seatData.length > 0
      ? await tx.seat.createMany({ data: seatData, skipDuplicates: true })
      : { count: 0 };

  return { committeesCreated, seatsCreated };
}
