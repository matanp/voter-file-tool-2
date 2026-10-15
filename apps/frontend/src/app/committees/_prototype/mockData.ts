/**
 * PROTOTYPE — throwaway mock data for ticket 01 (split-pane Variant A).
 *
 * Deterministic (seeded) so reloads look the same. Shapes are the real
 * `RosterResponse` / `CommitteeDetailResponse` types from
 * `lib/validations/committee.ts` so the layout is judged against the data the
 * shell will actually receive. Nothing here touches the database.
 */
import {
  MembershipType,
  MembershipStatus,
  MeetingType,
  PrivilegeLevel,
} from "@prisma/client";
import type {
  CommitteeDetailResponse,
  EdRollup,
  HistoryEvent,
  PendingMembership,
  RosterSummary,
  SeatRosterRow,
} from "~/lib/validations/committee";

// mulberry32 — good enough for fake rosters
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Maria", "James", "Linda", "Robert", "Patricia", "Michael", "Barbara",
  "William", "Elizabeth", "David", "Jennifer", "Richard", "Susan", "Joseph",
  "Karen", "Thomas", "Nancy", "Charles", "Lisa", "Daniel", "Sandra", "Paul",
  "Ashley", "Kevin", "Dorothy", "Brian", "Kimberly", "Edward", "Donna",
  "Ronald", "Carol", "Anthony", "Michelle", "Jason", "Amanda", "Matthew",
  "Melissa", "Gary", "Deborah", "Timothy", "Stephanie", "Jose", "Rebecca",
  "Larry", "Sharon", "Jeffrey", "Laura", "Frank", "Cynthia", "Scott",
];
const LAST = [
  "Rivera", "Nguyen", "Kowalski", "Johnson", "DiMarco", "Patel", "Brown",
  "Schmidt", "Washington", "O'Brien", "Garcia", "Russo", "Lee", "Hernandez",
  "Murphy", "Bianchi", "Thompson", "Kim", "Romano", "Jackson", "Fitzgerald",
  "Torres", "Nowak", "Reed", "Sullivan", "Ortiz", "Mancuso", "Bennett",
  "Ramos", "Collins", "Vitale", "Morales", "Wright", "Costello", "Flores",
  "Gallagher", "Sanders", "Perez", "Kaminski", "Hughes",
];

// Monroe County-ish. Rochester carries multiple LDs and most EDs; the rest are
// single-LD towns of varying size so grouping by town has to earn its keep.
const TOWNS: Array<{ cityTown: string; legDistricts: number[]; eds: number }> = [
  { cityTown: "ROCHESTER", legDistricts: [21, 22, 23, 24, 25, 26, 27, 28, 29], eds: 9 },
  { cityTown: "GREECE", legDistricts: [2], eds: 14 },
  { cityTown: "IRONDEQUOIT", legDistricts: [17], eds: 11 },
  { cityTown: "BRIGHTON", legDistricts: [10], eds: 8 },
  { cityTown: "HENRIETTA", legDistricts: [13], eds: 9 },
  { cityTown: "PENFIELD", legDistricts: [9], eds: 7 },
  { cityTown: "WEBSTER", legDistricts: [8], eds: 8 },
  { cityTown: "CHILI", legDistricts: [18], eds: 6 },
  { cityTown: "GATES", legDistricts: [20], eds: 6 },
  { cityTown: "PITTSFORD", legDistricts: [11], eds: 6 },
  { cityTown: "PERINTON", legDistricts: [12], eds: 7 },
  { cityTown: "OGDEN", legDistricts: [4], eds: 4 },
  { cityTown: "WHEATLAND", legDistricts: [3], eds: 3 },
  { cityTown: "RIGA", legDistricts: [3], eds: 2 },
  { cityTown: "SWEDEN", legDistricts: [1], eds: 5 },
  { cityTown: "HAMLIN", legDistricts: [1], eds: 3 },
];

export const TERM = {
  id: "term-2025",
  label: "2025–2027",
  startDate: "2025-09-30",
  endDate: "2027-09-30",
};
export const MAX_SEATS_PER_LTED = 4;

export type MockCommittee = {
  rollup: EdRollup;
  detail: CommitteeDetailResponse;
};

function isoDaysAgo(days: number) {
  const d = new Date(2026, 8, 19);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function buildCommittee(
  id: number,
  cityTown: string,
  legDistrict: number,
  electionDistrict: number,
  rand: () => number,
): MockCommittee {
  const usedNames = new Set<string>();
  const person = () => {
    let firstName: string, lastName: string;
    do {
      firstName = FIRST[Math.floor(rand() * FIRST.length)]!;
      lastName = LAST[Math.floor(rand() * LAST.length)]!;
    } while (usedNames.has(firstName + lastName));
    usedNames.add(firstName + lastName);
    return {
      VRCNUM: String(100000000 + Math.floor(rand() * 899999999)),
      firstName,
      lastName,
    };
  };

  const totalSeats = rand() < 0.15 ? 2 : MAX_SEATS_PER_LTED;
  // Occupancy skews toward filled but leaves plenty of vacancies to hunt for.
  const fillRate = rand() < 0.2 ? 0.25 : 0.7;
  const rows: SeatRosterRow[] = [];
  const weightSeats: CommitteeDetailResponse["designationWeightSummary"]["seats"] = [];
  const missingWeightSeatNumbers: number[] = [];
  let totalWeight = 0;
  let contributing = 0;
  let filled = 0;

  for (let seat = 1; seat <= totalSeats; seat++) {
    const isPetitioned = rand() < 0.55;
    const occupied = rand() < fillRate;
    const weightMissing = isPetitioned && rand() < 0.3;
    const seatWeight = isPetitioned && !weightMissing
      ? Math.round((40 + rand() * 120) * 100) / 100
      : null;
    if (weightMissing) missingWeightSeatNumbers.push(seat);
    const occupant = occupied
      ? {
          ...person(),
          membershipType: isPetitioned
            ? MembershipType.PETITIONED
            : MembershipType.APPOINTED,
        }
      : null;
    if (occupied) filled++;
    const contributes = occupied && isPetitioned && seatWeight !== null;
    if (contributes) {
      totalWeight += seatWeight;
      contributing++;
    }
    rows.push({
      committeeListId: id,
      cityTown,
      legDistrict,
      electionDistrict,
      seatNumber: seat,
      isPetitioned,
      weight: seatWeight === null ? null : seatWeight.toFixed(2),
      petitionedVacant: isPetitioned && !occupied ? true : undefined,
      occupant,
      contact: occupant
        ? {
            email: rand() < 0.7
              ? `${occupant.firstName.toLowerCase()}.${occupant.lastName.toLowerCase().replace("'", "")}@example.com`
              : null,
            phone: rand() < 0.5 ? `585-555-${String(1000 + Math.floor(rand() * 9000))}` : null,
          }
        : undefined,
    });
    weightSeats.push({
      seatNumber: seat,
      isPetitioned,
      isOccupied: occupied,
      occupantMembershipType: occupant?.membershipType ?? null,
      seatWeight,
      contributes,
      contributionWeight: contributes ? seatWeight : 0,
    });
  }

  // A few committees carry an unassigned (seatless) active member.
  const unassignedCount = rand() < 0.08 ? 1 : 0;
  if (unassignedCount) {
    rows.push({
      committeeListId: id,
      cityTown,
      legDistrict,
      electionDistrict,
      seatNumber: null,
      isPetitioned: false,
      weight: null,
      unassigned: true,
      occupant: { ...person(), membershipType: MembershipType.APPOINTED },
    });
  }

  const vacantSeats = rows.filter((r) => r.seatNumber !== null && !r.occupant);
  const pendingN = vacantSeats.length > 0 && rand() < 0.35 ? (rand() < 0.3 ? 2 : 1) : 0;
  const pending: PendingMembership[] = [];
  for (let i = 0; i < pendingN; i++) {
    const p = person();
    const replacing = rand() < 0.3 ? rows.find((r) => r.occupant) : undefined;
    pending.push({
      voterRecordId: p.VRCNUM,
      firstName: p.firstName,
      lastName: p.lastName,
      membershipId: `mem-${id}-${i}`,
      submittedAt: isoDaysAgo(Math.floor(rand() * 40)),
      isOwnSubmission: rand() < 0.4,
      replacementFor: replacing?.occupant
        ? {
            voterRecordId: replacing.occupant.VRCNUM,
            firstName: replacing.occupant.firstName,
            lastName: replacing.occupant.lastName,
          }
        : null,
      submittedBy: { id: "u-leader", name: rand() < 0.5 ? "Dana Whitfield" : "Sam Okafor" },
      requestNotes: rand() < 0.5 ? "Active volunteer, petitioned last cycle." : undefined,
    });
  }

  const events: HistoryEvent[] = [];
  const actorAdmin = { role: PrivilegeLevel.Admin, name: "Chris Alvarez" };
  const actorLeader = { role: PrivilegeLevel.Leader, name: "Dana Whitfield" };
  let day = 2;
  const push = (e: HistoryEvent) => events.push(e);
  rows.filter((r) => r.occupant).forEach((r, i) => {
    const member = {
      name: `${r.occupant!.firstName} ${r.occupant!.lastName}`,
      seatNumber: r.seatNumber,
      voterRecordId: r.occupant!.VRCNUM,
    };
    day += 3 + Math.floor(rand() * 25);
    if (r.occupant!.membershipType === MembershipType.PETITIONED) {
      push({
        id: `ev-${id}-${i}-po`, at: isoDaysAgo(day + 200), actor: actorAdmin, member,
        source: "petition_outcome", kind: "petition_outcome", outcome: "won",
        seatNumber: r.seatNumber, primaryDate: "2025-06-24", voteCount: 20 + Math.floor(rand() * 200),
      });
    } else {
      push({
        id: `ev-${id}-${i}-act`, at: isoDaysAgo(day), actor: actorAdmin, member,
        source: "meeting", kind: "confirmed", membershipType: MembershipType.APPOINTED,
        meeting: { id: `mtg-${day}`, meetingDate: isoDaysAgo(day).slice(0, 10), meetingType: MeetingType.EXECUTIVE_COMMITTEE },
      });
      push({
        id: `ev-${id}-${i}-sub`, at: isoDaysAgo(day + 12), actor: actorLeader, member,
        source: "manual", kind: "submitted",
      });
    }
  });
  if (rand() < 0.4) {
    const p = person();
    day += 30;
    push({
      id: `ev-${id}-res`, at: isoDaysAgo(day), actor: actorAdmin,
      member: { name: `${p.firstName} ${p.lastName}`, seatNumber: vacantSeats[0]?.seatNumber ?? 1 },
      source: "manual", kind: "resigned", effectiveDate: isoDaysAgo(day + 4).slice(0, 10), method: "EMAIL",
    });
  }
  if (rand() < 0.25) {
    const p = person();
    day += 20;
    push({
      id: `ev-${id}-rem`, at: isoDaysAgo(day), actor: actorAdmin,
      member: { name: `${p.firstName} ${p.lastName}`, seatNumber: 2 },
      source: "manual", kind: "removed", reason: "MOVED_OUT_OF_DISTRICT",
    });
  }
  events.sort((a, b) => (a.at < b.at ? 1 : -1));

  const rollup: EdRollup = {
    committeeListId: id,
    cityTown,
    legDistrict,
    electionDistrict,
    filled,
    totalSeats,
    unassignedCount,
    pendingCount: pending.length,
    designationWeight: missingWeightSeatNumbers.length ? null : Math.round(totalWeight * 100) / 100,
    missingWeightSeatNumbers,
  };

  const detail: CommitteeDetailResponse = {
    committee: {
      committeeListId: id,
      cityTown,
      legDistrict,
      electionDistrict,
      termId: TERM.id,
      ltedWeight: rand() < 0.8 ? (Math.round((150 + rand() * 400) * 100) / 100).toFixed(2) : null,
    },
    term: TERM,
    maxSeatsPerLted: MAX_SEATS_PER_LTED,
    rollup,
    rows,
    designationWeightSummary: {
      totalWeight: Math.round(totalWeight * 100) / 100,
      totalContributingSeats: contributing,
      seats: weightSeats,
      missingWeightSeatNumbers,
    },
    pending,
    petitionContext: rows
      .filter((r) => r.isPetitioned && r.occupant)
      .map((r, i) => ({
        id: `pc-${id}-${i}`,
        voterRecordId: r.occupant!.VRCNUM,
        voter: r.occupant!,
        seatNumber: r.seatNumber,
        petitionSeatNumber: r.seatNumber,
        status: MembershipStatus.ACTIVE,
        petitionPrimaryDate: "2025-06-24",
        petitionVoteCount: 20 + Math.floor(rand() * 200),
      })),
    history: { events: events.slice(0, 50), hasMore: events.length > 50 },
  };

  return { rollup, detail };
}

function buildAll(): MockCommittee[] {
  const rand = rng(20260919);
  const out: MockCommittee[] = [];
  let id = 1000;
  for (const t of TOWNS) {
    for (const ld of t.legDistricts) {
      for (let ed = 1; ed <= t.eds; ed++) {
        out.push(buildCommittee(id++, t.cityTown, ld, ed, rand));
      }
    }
  }
  return out;
}

export const MOCK_COMMITTEES: MockCommittee[] = buildAll();
export const MOCK_ROLLUPS: EdRollup[] = MOCK_COMMITTEES.map((c) => c.rollup);
export const MOCK_BY_ID = new Map(MOCK_COMMITTEES.map((c) => [c.rollup.committeeListId, c]));

export function summarize(rollups: EdRollup[]): RosterSummary {
  return rollups.reduce<RosterSummary>(
    (s, r) => ({
      totalSeats: s.totalSeats + r.totalSeats,
      filled: s.filled + r.filled,
      vacant: s.vacant + (r.totalSeats - r.filled),
      edCount: s.edCount + 1,
      unassignedCount: s.unassignedCount + r.unassignedCount,
      pendingCount: s.pendingCount + r.pendingCount,
      activeMemberCount: s.activeMemberCount + r.filled + r.unassignedCount,
    }),
    { totalSeats: 0, filled: 0, vacant: 0, edCount: 0, unassignedCount: 0, pendingCount: 0, activeMemberCount: 0 },
  );
}

/** Fake candidate search results for the add-member drawer stub. */
export function mockCandidates(query: string) {
  const rand = rng(query.length * 7919 + 17);
  const n = query.trim() ? 4 : 0;
  return Array.from({ length: n }, (_, i) => {
    const firstName = FIRST[Math.floor(rand() * FIRST.length)]!;
    const lastName = query.trim().length > 2
      ? query.trim()[0]!.toUpperCase() + query.trim().slice(1).toLowerCase()
      : LAST[Math.floor(rand() * LAST.length)]!;
    return {
      VRCNUM: String(200000000 + Math.floor(rand() * 899999999)),
      firstName,
      lastName,
      party: "DEM",
      address: `${10 + Math.floor(rand() * 900)} ${["Main St", "Elm Ave", "Scottsville Rd", "Lake Ave", "Monroe Ave"][i % 5]}`,
      inDistrict: i !== 2,
      eligible: i !== 1,
      warning: i === 3 ? "Registration inactive since 2024" : null,
      hardStop: i === 1 ? "Not enrolled in the party" : null,
    };
  });
}

export const capitalize = (s: string) =>
  s.toLowerCase().replace(/(^|\s|')\w/g, (m) => m.toUpperCase());
