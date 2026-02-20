import type { CommitteeList, CommitteeMembership, Seat, VoterRecord } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { EnrichedPartialVoterRecordAPI } from '@voter-file-tool/shared-validators';
import {
  convertPrismaVoterRecordToAPI,
  applyCompoundFields,
} from '@voter-file-tool/shared-validators';
import { prisma } from './lib/prisma';

export type CommitteeWithMembers = CommitteeList & {
  memberships?: (CommitteeMembership & { voterRecord: VoterRecord })[];
};

export type CommitteeWithMembersAndSeats = CommitteeWithMembers & {
  seats?: Seat[];
};

export type CommitteeReportStructure = {
  cityTown: string;
  legDistrict: number;
  committees: Record<string, EnrichedPartialVoterRecordAPI[]>;
};

/**
 * Converts a voter record to a committee member with compound fields
 * @param voter - Database voter record
 * @returns Member data with compound name and address fields
 */
export const mapVoterRecordToMember = (
  voter: VoterRecord
): EnrichedPartialVoterRecordAPI => {
  // Convert Prisma record to API format first
  const apiRecord = convertPrismaVoterRecordToAPI(voter);
  // Apply compound fields (name and address)
  return applyCompoundFields(apiRecord);
};

/**
 * Transforms committee data into report structure
 * @param committees - Database committees with active memberships
 * @returns Grouped committee data by location and election district
 */
export const mapCommitteesToReportShape = (
  committees: CommitteeWithMembers[]
): CommitteeReportStructure[] => {
  const groupMap = new Map<string, CommitteeReportStructure>();

  for (const committee of committees) {
    const groupKey = `${committee.cityTown}|${committee.legDistrict}`;

    let group = groupMap.get(groupKey);
    if (!group) {
      group = {
        cityTown: committee.cityTown,
        legDistrict: committee.legDistrict,
        committees: {},
      };
      groupMap.set(groupKey, group);
    }

    const members =
      committee.memberships?.map((membership) => mapVoterRecordToMember(membership.voterRecord)) ?? [];
    const electionDistrictKey = String(committee.electionDistrict);

    if (!group.committees[electionDistrictKey]) {
      group.committees[electionDistrictKey] = [];
    }
    group.committees[electionDistrictKey]?.push(...members);
  }

  // Convert Map values to array and cleanup: drop empty EDs and then drop groups with no EDs
  return Array.from(groupMap.values())
    .map((group) => ({
      ...group,
      committees: Object.fromEntries(
        Object.entries(group.committees).filter(
          ([, members]) => members.length > 0
        )
      ),
    }))
    .filter((group) => Object.keys(group.committees).length > 0);
};

/**
 * Fetches the active CommitteeTerm ID (SRS §5.1).
 */
async function getActiveTermId(): Promise<string> {
  const term = await prisma.committeeTerm.findFirst({
    where: { isActive: true },
  });
  if (!term) throw new Error('No active CommitteeTerm — create one in Admin > Terms');
  return term.id;
}

/**
 * Retrieves all committee data with active memberships from the database.
 * Filters by active term (SRS §5.1).
 * @returns Committee records with included member data
 */
export async function fetchCommitteeData(): Promise<CommitteeWithMembers[]> {
  try {
    const activeTermId = await getActiveTermId();

    const committees = await prisma.committeeList.findMany({
      where: { termId: activeTermId },
      include: {
        memberships: {
          where: {
            termId: activeTermId,
            status: 'ACTIVE',
          },
          include: {
            voterRecord: true,
          },
        },
      },
    });

    return committees;
  } catch (error) {
    console.error('Error fetching committee data:', error);
    if (error instanceof Error) {
      // Preserve the original stack trace by rethrowing the original error
      // with additional context in the message
      const enhancedError = new Error(
        `Failed to fetch committee data: ${error.message}`
      );
      enhancedError.stack = error.stack;
      throw enhancedError;
    }
    throw new Error('Failed to fetch committee data: Unknown error');
  }
}

// ---------------------------------------------------------------------------
// SRS 2.7 — Designation-weight helpers for report generation (§3.3/§3.4)
// ---------------------------------------------------------------------------

export type SeatWeightBreakdown = {
  seatNumber: number;
  isPetitioned: boolean;
  isOccupied: boolean;
  occupantMembershipType: string | null;
  seatWeight: number | null;
  contributes: boolean;
  contributionWeight: number;
};

export type DesignationWeightSummary = {
  committeeListId: number;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  totalWeight: number;
  totalContributingSeats: number;
  seats: SeatWeightBreakdown[];
  missingWeightSeatNumbers: number[];
};

/**
 * Computes designation-weight breakdown for a single committee.
 * Designed for batch use in report generation — accepts pre-fetched data
 * to avoid N+1 queries.
 */
export function computeDesignationWeight(
  committee: CommitteeWithMembersAndSeats,
): DesignationWeightSummary {
  const seats = committee.seats ?? [];
  const activeMemberships = (committee.memberships ?? []).filter(
    (m) => m.status === 'ACTIVE' && m.seatNumber != null,
  );

  const seatOccupants = new Map<number, CommitteeMembership & { voterRecord: VoterRecord }>();
  for (const m of activeMemberships) {
    if (m.seatNumber != null) {
      if (seatOccupants.has(m.seatNumber)) {
        throw new Error(
          `Data integrity error: duplicate active memberships on seat ${String(m.seatNumber)} ` +
            `for committee ${String(committee.id)} term ${committee.termId}`,
        );
      }
      seatOccupants.set(m.seatNumber, m);
    }
  }

  const missingWeightSeatNumbers: number[] = [];
  let totalWeightDecimal = new Prisma.Decimal(0);
  let totalContributingSeats = 0;

  const seatBreakdowns: SeatWeightBreakdown[] = seats
    .slice()
    .sort((a, b) => a.seatNumber - b.seatNumber)
    .map((seat) => {
      const occupant = seatOccupants.get(seat.seatNumber);
      const isOccupied = !!occupant;
      const seatWeight =
        seat.weight != null ? new Prisma.Decimal(seat.weight).toNumber() : null;

      if (!seat.isPetitioned || seatWeight == null) {
        if (seat.isPetitioned && seatWeight == null) {
          missingWeightSeatNumbers.push(seat.seatNumber);
        }
        return {
          seatNumber: seat.seatNumber,
          isPetitioned: seat.isPetitioned,
          isOccupied,
          occupantMembershipType: occupant?.membershipType ?? null,
          seatWeight,
          contributes: false,
          contributionWeight: 0,
        };
      }

      const contributes = isOccupied;
      const contributionWeight = contributes ? seatWeight : 0;
      if (contributes) {
        totalWeightDecimal = totalWeightDecimal.add(
          new Prisma.Decimal(contributionWeight),
        );
        totalContributingSeats += 1;
      }

      return {
        seatNumber: seat.seatNumber,
        isPetitioned: true,
        isOccupied,
        occupantMembershipType: occupant?.membershipType ?? null,
        seatWeight,
        contributes,
        contributionWeight,
      };
    });

  return {
    committeeListId: committee.id,
    cityTown: committee.cityTown,
    legDistrict: committee.legDistrict,
    electionDistrict: committee.electionDistrict,
    totalWeight: totalWeightDecimal.toNumber(),
    totalContributingSeats,
    seats: seatBreakdowns,
    missingWeightSeatNumbers,
  };
}

/**
 * Fetches all committees with seats and active memberships,
 * then computes designation weight for each.
 * Use in report generation for §3.3/§3.4.
 */
export async function fetchDesignationWeights(): Promise<DesignationWeightSummary[]> {
  const activeTermId = await getActiveTermId();

  const committees = await prisma.committeeList.findMany({
    where: { termId: activeTermId },
    include: {
      memberships: {
        where: { termId: activeTermId, status: 'ACTIVE' },
        include: { voterRecord: true },
      },
      seats: { orderBy: { seatNumber: 'asc' } },
    },
  });

  return committees.map(computeDesignationWeight);
}
