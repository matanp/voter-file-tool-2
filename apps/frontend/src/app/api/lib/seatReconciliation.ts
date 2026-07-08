/**
 * Reconciles active-term Seat rows when governance maxSeatsPerLted changes.
 */

import { Prisma } from "@prisma/client";
import { ACTIVE_MEMBERSHIP_STATUS } from "./committeeValidation";
import { recomputeSeatWeights } from "./seatUtils";

type SeatReconciliationClient = Pick<
  typeof import("~/lib/prisma").default,
  "committeeList" | "committeeMembership" | "seat"
>;

export type SeatReconciliationSummary = {
  direction: "increase" | "decrease" | "unchanged";
  committeeCount: number;
  createdSeatCount: number;
  deletedSeatCount: number;
  recomputedCommitteeCount: number;
};

export type SeatDecreaseConflictSampleCommittee = {
  committeeListId: number;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
};

export type SeatDecreaseConflictDetails = {
  activeMembershipsOverMaxCount: number;
  committeesOverCapacityCount: number;
  petitionedSeatsOverMaxCount: number;
  sampleCommittees: SeatDecreaseConflictSampleCommittee[];
};

/** Thrown when decreasing max seats would strand active or petitioned seats. */
export class SeatDecreaseConflictError extends Error {
  readonly details: SeatDecreaseConflictDetails;

  constructor(details: SeatDecreaseConflictDetails) {
    super(
      "Cannot decrease maxSeatsPerLted while active-term seats are in use",
    );
    this.name = "SeatDecreaseConflictError";
    this.details = details;
  }
}

type ReconcileSeatsParams = {
  termId: string;
  oldMaxSeats: number;
  newMaxSeats: number;
};

const CREATE_MANY_CHUNK_SIZE = 500;
const CONFLICT_SAMPLE_LIMIT = 5;

function committeeKey(
  committeeListId: number,
  cityTown: string,
  legDistrict: number,
  electionDistrict: number,
): string {
  return `${committeeListId}:${cityTown}:${legDistrict}:${electionDistrict}`;
}

/** Builds a sorted, deduplicated sample of committees for conflict responses. */
function buildConflictSample(
  entries: SeatDecreaseConflictSampleCommittee[],
): SeatDecreaseConflictSampleCommittee[] {
  const seen = new Set<string>();
  const sample: SeatDecreaseConflictSampleCommittee[] = [];

  const sorted = [...entries].sort((a, b) => {
    const cityCompare = a.cityTown.localeCompare(b.cityTown);
    if (cityCompare !== 0) return cityCompare;
    if (a.legDistrict !== b.legDistrict) return a.legDistrict - b.legDistrict;
    if (a.electionDistrict !== b.electionDistrict) {
      return a.electionDistrict - b.electionDistrict;
    }
    return a.committeeListId - b.committeeListId;
  });

  for (const entry of sorted) {
    const key = committeeKey(
      entry.committeeListId,
      entry.cityTown,
      entry.legDistrict,
      entry.electionDistrict,
    );
    if (seen.has(key)) continue;
    seen.add(key);
    sample.push(entry);
    if (sample.length >= CONFLICT_SAMPLE_LIMIT) break;
  }

  return sample;
}

/** Returns true when any decrease blocker exists for the active term. */
async function findDecreaseBlockers(
  db: SeatReconciliationClient,
  termId: string,
  newMaxSeats: number,
): Promise<SeatDecreaseConflictDetails | null> {
  const [
    activeMembershipsOverMax,
    activeMembershipsForTerm,
    petitionedSeatsOverMax,
  ] = await Promise.all([
    db.committeeMembership.findMany({
      where: {
        termId,
        status: ACTIVE_MEMBERSHIP_STATUS,
        seatNumber: { gt: newMaxSeats },
      },
      select: {
        committeeListId: true,
        committeeList: {
          select: {
            cityTown: true,
            legDistrict: true,
            electionDistrict: true,
          },
        },
      },
    }),
    db.committeeMembership.findMany({
      where: {
        termId,
        status: ACTIVE_MEMBERSHIP_STATUS,
      },
      select: { committeeListId: true },
    }),
    db.seat.findMany({
      where: {
        termId,
        seatNumber: { gt: newMaxSeats },
        isPetitioned: true,
      },
      select: {
        committeeListId: true,
        committeeList: {
          select: {
            cityTown: true,
            legDistrict: true,
            electionDistrict: true,
          },
        },
      },
    }),
  ]);

  const activeCountByCommittee = new Map<number, number>();
  for (const membership of activeMembershipsForTerm) {
    activeCountByCommittee.set(
      membership.committeeListId,
      (activeCountByCommittee.get(membership.committeeListId) ?? 0) + 1,
    );
  }

  const committeesOverCapacityIds = [...activeCountByCommittee.entries()]
    .filter(([, count]) => count > newMaxSeats)
    .map(([committeeListId]) => committeeListId);

  const committeesOverCapacity =
    committeesOverCapacityIds.length > 0
      ? await db.committeeList.findMany({
          where: {
            termId,
            id: { in: committeesOverCapacityIds },
          },
          select: {
            id: true,
            cityTown: true,
            legDistrict: true,
            electionDistrict: true,
          },
        })
      : [];

  const activeMembershipsOverMaxCount = activeMembershipsOverMax.length;
  const committeesOverCapacityCount = committeesOverCapacity.length;
  const petitionedSeatsOverMaxCount = petitionedSeatsOverMax.length;

  if (
    activeMembershipsOverMaxCount === 0 &&
    committeesOverCapacityCount === 0 &&
    petitionedSeatsOverMaxCount === 0
  ) {
    return null;
  }

  const sampleEntries: SeatDecreaseConflictSampleCommittee[] = [
    ...activeMembershipsOverMax.map((membership) => ({
      committeeListId: membership.committeeListId,
      cityTown: membership.committeeList.cityTown,
      legDistrict: membership.committeeList.legDistrict,
      electionDistrict: membership.committeeList.electionDistrict,
    })),
    ...committeesOverCapacity.map((committee) => ({
      committeeListId: committee.id,
      cityTown: committee.cityTown,
      legDistrict: committee.legDistrict,
      electionDistrict: committee.electionDistrict,
    })),
    ...petitionedSeatsOverMax.map((seat) => ({
      committeeListId: seat.committeeListId,
      cityTown: seat.committeeList.cityTown,
      legDistrict: seat.committeeList.legDistrict,
      electionDistrict: seat.committeeList.electionDistrict,
    })),
  ];

  return {
    activeMembershipsOverMaxCount,
    committeesOverCapacityCount,
    petitionedSeatsOverMaxCount,
    sampleCommittees: buildConflictSample(sampleEntries),
  };
}

/** Creates missing seats for every active-term committee up to newMaxSeats. */
async function reconcileIncrease(
  db: SeatReconciliationClient,
  termId: string,
  newMaxSeats: number,
): Promise<
  Pick<
    SeatReconciliationSummary,
    "committeeCount" | "createdSeatCount" | "recomputedCommitteeCount"
  >
> {
  const committees = await db.committeeList.findMany({
    where: { termId },
    select: { id: true },
  });

  if (committees.length === 0) {
    return {
      committeeCount: 0,
      createdSeatCount: 0,
      recomputedCommitteeCount: 0,
    };
  }

  const committeeIds = committees.map((committee) => committee.id);
  const existingSeats = await db.seat.findMany({
    where: {
      termId,
      committeeListId: { in: committeeIds },
    },
    select: { committeeListId: true, seatNumber: true },
  });

  const existingByCommittee = new Map<number, Set<number>>();
  for (const seat of existingSeats) {
    const numbers =
      existingByCommittee.get(seat.committeeListId) ?? new Set<number>();
    numbers.add(seat.seatNumber);
    existingByCommittee.set(seat.committeeListId, numbers);
  }

  const toCreate: Prisma.SeatCreateManyInput[] = [];
  for (const committee of committees) {
    const existingNumbers = existingByCommittee.get(committee.id) ?? new Set();
    for (let seatNumber = 1; seatNumber <= newMaxSeats; seatNumber += 1) {
      if (existingNumbers.has(seatNumber)) continue;
      toCreate.push({
        committeeListId: committee.id,
        termId,
        seatNumber,
        isPetitioned: false,
        weight: null,
      });
    }
  }

  let createdSeatCount = 0;
  for (let index = 0; index < toCreate.length; index += CREATE_MANY_CHUNK_SIZE) {
    const chunk = toCreate.slice(index, index + CREATE_MANY_CHUNK_SIZE);
    const result = await db.seat.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    createdSeatCount += result.count;
  }

  for (const committee of committees) {
    await recomputeSeatWeights(committee.id, {
      tx: db as unknown as Prisma.TransactionClient,
      maxSeats: newMaxSeats,
    });
  }

  return {
    committeeCount: committees.length,
    createdSeatCount,
    recomputedCommitteeCount: committees.length,
  };
}

/** Deletes vacant, non-petitioned excess seats and recomputes weights. */
async function reconcileDecrease(
  db: SeatReconciliationClient,
  termId: string,
  newMaxSeats: number,
): Promise<
  Pick<
    SeatReconciliationSummary,
    "committeeCount" | "deletedSeatCount" | "recomputedCommitteeCount"
  >
> {
  const blockers = await findDecreaseBlockers(db, termId, newMaxSeats);
  if (blockers) {
    throw new SeatDecreaseConflictError(blockers);
  }

  const committees = await db.committeeList.findMany({
    where: { termId },
    select: { id: true },
  });

  if (committees.length === 0) {
    return {
      committeeCount: 0,
      deletedSeatCount: 0,
      recomputedCommitteeCount: 0,
    };
  }

  const excessSeats = await db.seat.findMany({
    where: {
      termId,
      seatNumber: { gt: newMaxSeats },
      isPetitioned: false,
    },
    select: { id: true, committeeListId: true, seatNumber: true },
  });

  const occupiedSeats = await db.committeeMembership.findMany({
    where: {
      termId,
      status: ACTIVE_MEMBERSHIP_STATUS,
      seatNumber: { not: null },
    },
    select: { committeeListId: true, seatNumber: true },
  });

  const occupiedKeys = new Set(
    occupiedSeats.map(
      (membership) =>
        `${membership.committeeListId}:${membership.seatNumber ?? ""}`,
    ),
  );

  const deletableSeatIds = excessSeats
    .filter(
      (seat) =>
        !occupiedKeys.has(`${seat.committeeListId}:${seat.seatNumber}`),
    )
    .map((seat) => seat.id);

  let deletedSeatCount = 0;
  if (deletableSeatIds.length > 0) {
    const deleteResult = await db.seat.deleteMany({
      where: { id: { in: deletableSeatIds } },
    });
    deletedSeatCount = deleteResult.count;
  }

  for (const committee of committees) {
    await recomputeSeatWeights(committee.id, {
      tx: db as unknown as Prisma.TransactionClient,
      maxSeats: newMaxSeats,
    });
  }

  return {
    committeeCount: committees.length,
    deletedSeatCount,
    recomputedCommitteeCount: committees.length,
  };
}

/**
 * Reconciles active-term seats when maxSeatsPerLted changes.
 * Increase creates missing seats; decrease rejects blockers or deletes excess vacant seats.
 */
export async function reconcileSeatsForMaxSeatsChange(
  tx: SeatReconciliationClient,
  params: ReconcileSeatsParams,
): Promise<SeatReconciliationSummary> {
  const { termId, oldMaxSeats, newMaxSeats } = params;

  if (oldMaxSeats === newMaxSeats) {
    return {
      direction: "unchanged",
      committeeCount: 0,
      createdSeatCount: 0,
      deletedSeatCount: 0,
      recomputedCommitteeCount: 0,
    };
  }

  if (oldMaxSeats < newMaxSeats) {
    const increaseSummary = await reconcileIncrease(tx, termId, newMaxSeats);
    return {
      direction: "increase",
      createdSeatCount: increaseSummary.createdSeatCount,
      deletedSeatCount: 0,
      committeeCount: increaseSummary.committeeCount,
      recomputedCommitteeCount: increaseSummary.recomputedCommitteeCount,
    };
  }

  const decreaseSummary = await reconcileDecrease(tx, termId, newMaxSeats);
  return {
    direction: "decrease",
    createdSeatCount: 0,
    deletedSeatCount: decreaseSummary.deletedSeatCount,
    committeeCount: decreaseSummary.committeeCount,
    recomputedCommitteeCount: decreaseSummary.recomputedCommitteeCount,
  };
}
