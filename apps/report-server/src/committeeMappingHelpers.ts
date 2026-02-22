import type { CommitteeMembership, Seat, VoterRecord } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  CommitteeWithMembers,
  EnrichedPartialVoterRecordAPI,
} from '@voter-file-tool/shared-validators';
import {
  convertPrismaVoterRecordToAPI,
  applyCompoundFields,
} from '@voter-file-tool/shared-validators';
import { prisma } from './lib/prisma';

export type { CommitteeWithMembers };

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

/**
 * Fetches committee data for sign-in sheet reports.
 * Filters by scope and jurisdiction; returns committees sorted by cityTown, legDistrict, electionDistrict.
 * @param scope - 'jurisdiction' (requires cityTown) or 'countywide'
 * @param cityTown - Required when scope is jurisdiction
 * @param legDistrict - Optional filter for Rochester LD
 * @returns Committee records with active memberships
 */
export async function fetchSignInSheetData(
  scope: 'jurisdiction' | 'countywide',
  cityTown?: string,
  legDistrict?: number,
): Promise<CommitteeWithMembers[]> {
  const activeTermId = await getActiveTermId();

  const where: Prisma.CommitteeListWhereInput = {
    termId: activeTermId,
  };

  if (scope === 'jurisdiction') {
    if (cityTown == null || cityTown === '') {
      throw new Error('cityTown is required when scope is jurisdiction');
    }
    where.cityTown = cityTown;
    if (legDistrict != null) {
      where.legDistrict = legDistrict;
    }
  }

  const committees = await prisma.committeeList.findMany({
    where,
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
    orderBy: [
      { cityTown: 'asc' },
      { legDistrict: 'asc' },
      { electionDistrict: 'asc' },
    ],
  });

  return committees;
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
 * Fetches committees with seats and active memberships,
 * then computes designation weight for each.
 * Use in report generation for §3.3/§3.4.
 * @param scope - 'jurisdiction' (requires cityTown) or 'countywide'; if omitted, returns all
 * @param cityTown - Required when scope is jurisdiction
 * @param legDistrict - Optional filter for Rochester LD
 * @returns Sorted by cityTown → legDistrict → electionDistrict
 */
export async function fetchDesignationWeights(
  scope?: 'jurisdiction' | 'countywide',
  cityTown?: string,
  legDistrict?: number,
): Promise<DesignationWeightSummary[]> {
  const activeTermId = await getActiveTermId();

  const where: Prisma.CommitteeListWhereInput = {
    termId: activeTermId,
  };

  if (scope === 'jurisdiction') {
    if (cityTown == null || cityTown === '') {
      throw new Error('cityTown is required when scope is jurisdiction');
    }
    where.cityTown = cityTown;
    if (legDistrict != null) {
      where.legDistrict = legDistrict;
    }
  }

  const committees = await prisma.committeeList.findMany({
    where,
    include: {
      memberships: {
        where: { termId: activeTermId, status: 'ACTIVE' },
        include: { voterRecord: true },
      },
      seats: { orderBy: { seatNumber: 'asc' } },
    },
    orderBy: [
      { cityTown: 'asc' },
      { legDistrict: 'asc' },
      { electionDistrict: 'asc' },
    ],
  });

  return committees.map(computeDesignationWeight);
}

// ---------------------------------------------------------------------------
// SRS 3.4 — Vacancy, Changes, and Petition Outcomes report data fetchers
// ---------------------------------------------------------------------------

export type VacancyReportRow = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  totalSeats: number;
  filledSeats: number;
  vacantSeats: number;
  petitionedSeats: number;
  vacantPetitionedSeats: number;
  nonPetitionedSeats: number;
};

/**
 * Fetches vacancy data for committees. Compares maxSeatsPerLted to active membership count.
 */
export async function fetchVacancyData(
  scope: 'jurisdiction' | 'countywide',
  vacancyFilter: 'all' | 'vacantOnly',
  cityTown?: string,
  legDistrict?: number,
): Promise<VacancyReportRow[]> {
  const activeTermId = await getActiveTermId();
  const config = await prisma.committeeGovernanceConfig.findFirst();
  const maxSeatsPerLted = config?.maxSeatsPerLted ?? 4;

  const where: Prisma.CommitteeListWhereInput = {
    termId: activeTermId,
  };
  if (scope === 'jurisdiction') {
    if (cityTown == null || cityTown === '') {
      throw new Error('cityTown is required when scope is jurisdiction');
    }
    where.cityTown = cityTown;
    if (legDistrict != null) {
      where.legDistrict = legDistrict;
    }
  }

  const committees = await prisma.committeeList.findMany({
    where,
    include: {
      seats: { orderBy: { seatNumber: 'asc' } },
      memberships: {
        where: { termId: activeTermId, status: 'ACTIVE' },
        include: { voterRecord: true },
      },
    },
    orderBy: [
      { cityTown: 'asc' },
      { legDistrict: 'asc' },
      { electionDistrict: 'asc' },
    ],
  });

  const rows: VacancyReportRow[] = [];

  for (const cl of committees) {
    const seats = cl.seats ?? [];
    const activeMemberships = cl.memberships ?? [];
    const filledSeats = activeMemberships.filter((m) => m.seatNumber != null).length;
    const totalSeats = maxSeatsPerLted;
    const vacantSeats = totalSeats - filledSeats;

    const petitionedSeats = seats.filter((s) => s.isPetitioned).length;
    const occupiedPetitionedSeats = activeMemberships.filter(
      (m) => m.seatNumber != null && seats.some((s) => s.seatNumber === m.seatNumber && s.isPetitioned),
    ).length;
    const vacantPetitionedSeats = petitionedSeats - occupiedPetitionedSeats;
    const nonPetitionedSeats = totalSeats - petitionedSeats;

    if (vacancyFilter === 'vacantOnly' && vacantSeats === 0) continue;

    rows.push({
      cityTown: cl.cityTown,
      legDistrict: cl.legDistrict,
      electionDistrict: cl.electionDistrict,
      totalSeats,
      filledSeats,
      vacantSeats,
      petitionedSeats,
      vacantPetitionedSeats,
      nonPetitionedSeats,
    });
  }

  return rows;
}

export type ChangesReportRow = {
  memberName: string;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  changeType: 'Added' | 'Resigned' | 'Removed' | 'Confirmed' | 'Petition Won' | 'Petition Lost';
  changeDate: string;
  details: string;
};

/**
 * Fetches committee membership changes within a date range.
 */
export async function fetchChangesData(
  scope: 'jurisdiction' | 'countywide',
  dateFrom: string,
  dateTo: string,
  cityTown?: string,
  legDistrict?: number,
): Promise<ChangesReportRow[]> {
  const activeTermId = await getActiveTermId();
  const fromDate = new Date(dateFrom);
  const toDate = new Date(dateTo);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error('Invalid dateFrom or dateTo');
  }
  if (fromDate > toDate) {
    throw new Error('dateFrom must be <= dateTo');
  }

  const rows: ChangesReportRow[] = [];

  const membershipWhere: Prisma.CommitteeMembershipWhereInput = {
    termId: activeTermId,
    OR: [
      { activatedAt: { gte: fromDate, lte: toDate } },
      { resignedAt: { gte: fromDate, lte: toDate } },
      { removedAt: { gte: fromDate, lte: toDate } },
      { confirmedAt: { gte: fromDate, lte: toDate } },
      { petitionPrimaryDate: { gte: fromDate, lte: toDate } },
    ],
  };

  const memberships = await prisma.committeeMembership.findMany({
    where: membershipWhere,
    include: {
      voterRecord: true,
      committeeList: true,
    },
  });

  const committeeWhere: Prisma.CommitteeListWhereInput = {};
  if (scope === 'jurisdiction') {
    if (cityTown == null || cityTown === '') {
      throw new Error('cityTown is required when scope is jurisdiction');
    }
    committeeWhere.cityTown = cityTown;
    if (legDistrict != null) {
      committeeWhere.legDistrict = legDistrict;
    }
  }

  for (const m of memberships) {
    const cl = m.committeeList;
    if (scope === 'jurisdiction') {
      if (cl.cityTown !== cityTown) continue;
      if (legDistrict != null && cl.legDistrict !== legDistrict) continue;
    }

    const name = [m.voterRecord.firstName, m.voterRecord.lastName].filter(Boolean).join(' ') || m.voterRecord.VRCNUM;
    const cityTownVal = cl.cityTown;
    const legDistrictVal = cl.legDistrict;
    const electionDistrict = cl.electionDistrict;

    const candidates: { changeType: ChangesReportRow['changeType']; changeDate: Date; details: string }[] = [];

    if (m.activatedAt && m.activatedAt >= fromDate && m.activatedAt <= toDate) {
      const changeType: ChangesReportRow['changeType'] =
        m.membershipType === 'PETITIONED' ? 'Petition Won' : 'Added';
      candidates.push({
        changeType,
        changeDate: m.activatedAt,
        details: changeType === 'Petition Won' && m.petitionVoteCount != null
          ? `${m.petitionVoteCount} votes`
          : '',
      });
    }
    if (m.resignedAt && m.resignedAt >= fromDate && m.resignedAt <= toDate) {
      const details = m.resignationMethod ? `Method: ${m.resignationMethod}` : '';
      candidates.push({ changeType: 'Resigned', changeDate: m.resignedAt, details });
    }
    if (m.removedAt && m.removedAt >= fromDate && m.removedAt <= toDate) {
      const details = [m.removalReason, m.removalNotes].filter(Boolean).join(' — ') || '';
      candidates.push({ changeType: 'Removed', changeDate: m.removedAt, details });
    }
    if (m.confirmedAt && m.confirmedAt >= fromDate && m.confirmedAt <= toDate) {
      candidates.push({ changeType: 'Confirmed', changeDate: m.confirmedAt, details: '' });
    }
    if (
      (m.status === 'PETITIONED_LOST' || m.status === 'PETITIONED_TIE') &&
      m.petitionPrimaryDate &&
      m.petitionPrimaryDate >= fromDate &&
      m.petitionPrimaryDate <= toDate
    ) {
      const details = m.petitionVoteCount != null
        ? `${m.petitionVoteCount} votes`
        : m.status === 'PETITIONED_TIE'
          ? 'Tie'
          : '';
      candidates.push({
        changeType: 'Petition Lost',
        changeDate: m.petitionPrimaryDate,
        details,
      });
    }

    for (const c of candidates) {
      rows.push({
        memberName: name,
        cityTown: cityTownVal,
        legDistrict: legDistrictVal,
        electionDistrict,
        changeType: c.changeType,
        changeDate: c.changeDate.toISOString().slice(0, 10),
        details: c.details,
      });
    }
  }

  rows.sort((a, b) => (b.changeDate === a.changeDate ? 0 : b.changeDate > a.changeDate ? 1 : -1));
  return rows;
}

export type PetitionOutcomeRow = {
  committeeListId: number;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  seatNumber: number;
  candidateName: string;
  voteCount: number | null;
  outcome: 'Won' | 'Unopposed' | 'Lost' | 'Tie';
  primaryDate: string | null;
};

/**
 * Maps MembershipStatus + seat candidate count to human-readable outcome label.
 */
export function getPetitionOutcomeLabel(
  status: string,
  membershipType: string | null,
  seatCandidateCount: number,
): 'Won' | 'Unopposed' | 'Lost' | 'Tie' {
  if (status === 'PETITIONED_LOST') return 'Lost';
  if (status === 'PETITIONED_TIE') return 'Tie';
  if (status === 'ACTIVE' && membershipType === 'PETITIONED') {
    return seatCandidateCount === 1 ? 'Unopposed' : 'Won';
  }
  return 'Lost';
}

/**
 * Fetches petition outcome data for report generation.
 */
export async function fetchPetitionOutcomesData(
  scope: 'jurisdiction' | 'countywide',
  cityTown?: string,
  legDistrict?: number,
): Promise<PetitionOutcomeRow[]> {
  const activeTermId = await getActiveTermId();

  const committeeWhere: Prisma.CommitteeListWhereInput = {
    termId: activeTermId,
  };
  if (scope === 'jurisdiction') {
    if (cityTown == null || cityTown === '') {
      throw new Error('cityTown is required when scope is jurisdiction');
    }
    committeeWhere.cityTown = cityTown;
    if (legDistrict != null) {
      committeeWhere.legDistrict = legDistrict;
    }
  }

  const memberships = await prisma.committeeMembership.findMany({
    where: {
      termId: activeTermId,
      membershipType: 'PETITIONED',
      petitionSeatNumber: { not: null },
    },
    include: {
      voterRecord: true,
      committeeList: true,
    },
  });

  const petBySeat = new Map<string, (typeof memberships)[0][]>();
  for (const m of memberships) {
    if (m.petitionSeatNumber == null) continue;
    const cl = m.committeeList;
    if (scope === 'jurisdiction') {
      if (cl.cityTown !== cityTown) continue;
      if (legDistrict != null && cl.legDistrict !== legDistrict) continue;
    }
    const key = `${cl.id}|${m.termId}|${m.petitionSeatNumber}`;
    const list = petBySeat.get(key) ?? [];
    list.push(m);
    petBySeat.set(key, list);
  }

  const lostOrTie = await prisma.committeeMembership.findMany({
    where: {
      termId: activeTermId,
      membershipType: 'PETITIONED',
      status: { in: ['PETITIONED_LOST', 'PETITIONED_TIE'] },
    },
    include: {
      voterRecord: true,
      committeeList: true,
    },
  });

  // PETITIONED_LOST memberships have petitionSeatNumber === null (per ticket: "Lost primary; seatNumber is null").
  // Group them under synthetic seat 0 for display.
  for (const m of lostOrTie) {
    const cl = m.committeeList;
    if (scope === 'jurisdiction') {
      if (cl.cityTown !== cityTown) continue;
      if (legDistrict != null && cl.legDistrict !== legDistrict) continue;
    }
    const seatNum = m.petitionSeatNumber ?? 0;
    const key = `${cl.id}|${m.termId}|${seatNum}`;
    const list = petBySeat.get(key) ?? [];
    list.push(m);
    petBySeat.set(key, list);
  }

  const rows: PetitionOutcomeRow[] = [];

  for (const [, candidates] of petBySeat) {
    if (candidates.length === 0) continue;
    const first = candidates[0];
    const cl = first.committeeList;
    const seatNum = first.petitionSeatNumber ?? candidates.find((c) => c.petitionSeatNumber != null)?.petitionSeatNumber ?? 0;
    const count = candidates.length;

    for (const m of candidates) {
      const name = [m.voterRecord.firstName, m.voterRecord.lastName].filter(Boolean).join(' ') || m.voterRecord.VRCNUM;
      const outcome = getPetitionOutcomeLabel(m.status, m.membershipType ?? null, count);
      rows.push({
        committeeListId: cl.id,
        cityTown: cl.cityTown,
        legDistrict: cl.legDistrict,
        electionDistrict: cl.electionDistrict,
        seatNumber: seatNum,
        candidateName: name,
        voteCount: m.petitionVoteCount,
        outcome,
        primaryDate: m.petitionPrimaryDate ? m.petitionPrimaryDate.toISOString().slice(0, 10) : null,
      });
    }
  }

  rows.sort((a, b) => {
    if (a.cityTown !== b.cityTown) return a.cityTown.localeCompare(b.cityTown);
    if (a.legDistrict !== b.legDistrict) return a.legDistrict - b.legDistrict;
    if (a.electionDistrict !== b.electionDistrict) return a.electionDistrict - b.electionDistrict;
    return a.seatNumber - b.seatNumber;
  });

  return rows;
}
