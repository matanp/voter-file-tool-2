import { PAPER } from '../common';
import { FIXED_DATE_LONG, REPORT_AUTHOR } from './shared';
import { CHANGE_TYPES, type ChangesRowSpec, type Expectations, type Fixture, type FixtureFamily, type Outcome, type OutcomeRowSpec, type VacancyRowSpec } from './types';

/**
 * Vacancy, changes and petition outcomes are one flowing table each; the browser decides
 * where pages break. Their page counts are `browser-paginated`: an approved full-Chrome
 * reference supplies them (baselines/approvals.json). Content checks still run on every page.
 */
const flowing = (required: string[], tokens: string[], extra: Partial<Expectations> = {}): Expectations => ({
  paper: PAPER.letterLandscape,
  pages: 'browser-paginated',
  tokenCounts: Object.fromEntries(tokens.map((t) => [t, 1])),
  orderedTokens: tokens,
  required: [FIXED_DATE_LONG, REPORT_AUTHOR, ...required],
  ...extra,
});

// ------------------------------------------------------------------ vacancy

/** EDs double as tokens: 9001+ can't collide with seat counts or totals (<= 800). */
function vacancyRows(cityTown: string, legDistrict: number, count: number, startEd: number): VacancyRowSpec[] {
  return Array.from({ length: count }, (_, k) => {
    const filled = k % 5; // 0..4 of 4 seats, with 4 meaning a full committee
    const filledSeats = Math.min(filled, 4);
    const petitionedSeats = 2 + (k % 3); // 2..4
    const vacantPetitionedSeats = Math.max(0, petitionedSeats - filledSeats);
    return {
      cityTown,
      legDistrict,
      electionDistrict: startEd + k,
      totalSeats: 4,
      filledSeats,
      vacantSeats: 4 - filledSeats,
      petitionedSeats,
      vacantPetitionedSeats,
      nonPetitionedSeats: 4 - petitionedSeats,
    };
  });
}

function vacancyExpectations(rows: VacancyRowSpec[]): Expectations {
  type Sum = [number, number, number, number, number, number];
  const add = (s: Sum, r: VacancyRowSpec): Sum => [
    s[0] + r.totalSeats,
    s[1] + r.filledSeats,
    s[2] + r.vacantSeats,
    s[3] + (r.petitionedSeats - r.vacantPetitionedSeats),
    s[4] + r.vacantPetitionedSeats,
    s[5] + r.nonPetitionedSeats,
  ];
  const zero: Sum = [0, 0, 0, 0, 0, 0];
  const keys = [...new Set(rows.map((r) => `${r.cityTown}|${r.legDistrict}`))].sort((a, b) => {
    const [ca, la] = a.split('|');
    const [cb, lb] = b.split('|');
    return ca! < cb! ? -1 : ca! > cb! ? 1 : Number(la) - Number(lb);
  });
  const required: string[] = [];
  const tokens: string[] = [];
  for (const key of keys) {
    const groupRows = rows.filter((r) => `${r.cityTown}|${r.legDistrict}` === key);
    required.push(`${groupRows[0]!.cityTown}, LD ${groupRows[0]!.legDistrict}`);
    required.push(`Subtotal ${groupRows.reduce(add, zero).join(' ')}`);
    tokens.push(...groupRows.map((r) => String(r.electionDistrict)));
  }
  required.push(`Grand Total ${rows.reduce(add, zero).join(' ')}`);
  return flowing(['Vacancy Report', ...required], tokens);
}

const vacancyFixture = (id: string, tier: Fixture['tier'], purpose: string, rows: VacancyRowSpec[]): Fixture => ({
  id,
  tier,
  purpose,
  input: { jobType: 'vacancyReport', rows },
  expect: vacancyExpectations(rows),
});

// ------------------------------------------------------------------ changes

const changeToken = (i: number) => `CHG${String(i).padStart(5, '0')}`;
const CHANGE_DATES = ['2026-02-02', '2026-02-09', '2026-02-16', '2026-02-23'];
const SHORT_DATE: Record<string, string> = {
  '2026-02-02': 'Feb 2, 2026',
  '2026-02-09': 'Feb 9, 2026',
  '2026-02-16': 'Feb 16, 2026',
  '2026-02-23': 'Feb 23, 2026',
  '2026-02-01': 'Feb 1, 2026',
  '2026-02-28': 'Feb 28, 2026',
};
const LONG_DETAIL =
  'Resigned by letter dated the first of the month; replacement to be appointed at the next meeting of the executive committee after notice to all members in the district';

function changesRows(count: number, opts: { long?: boolean } = {}): ChangesRowSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    memberName: `${changeToken(i + 1)} TESTER`,
    cityTown: i % 2 ? 'BRIGHTON' : 'ROCHESTER',
    legDistrict: 16 + (i % 3),
    electionDistrict: 1 + (i % 40),
    changeType: CHANGE_TYPES[i % CHANGE_TYPES.length]!,
    changeDate: CHANGE_DATES[i % CHANGE_DATES.length]!,
    details: opts.long && i % 4 === 0 ? `${LONG_DETAIL} (${i + 1})` : `Detail ${i + 1}`,
  }));
}

function changesExpectations(rows: ChangesRowSpec[], dateFrom: string, dateTo: string): Expectations {
  // Newest date first; within a date by change type, then member name.
  const ordered = [...rows].sort(
    (a, b) =>
      (a.changeDate < b.changeDate ? 1 : a.changeDate > b.changeDate ? -1 : 0) ||
      (a.changeType < b.changeType ? -1 : a.changeType > b.changeType ? 1 : 0) ||
      (a.memberName < b.memberName ? -1 : a.memberName > b.memberName ? 1 : 0),
  );
  const tokens = ordered.map((r) => r.memberName.split(' ')[0]!);
  return flowing(
    ['Committee Changes', `${SHORT_DATE[dateFrom]} — ${SHORT_DATE[dateTo]}`, ...new Set(rows.map((r) => SHORT_DATE[r.changeDate]!)), ...new Set(rows.map((r) => r.changeType))],
    tokens,
    {
      reviewNotes: [
        'Geometry: the component lays out an 8.5in-wide portrait container but production prints Letter landscape. Report clipped or overflowing content as a defect; do not approve it as expected layout.',
      ],
    },
  );
}

const changesFixture = (id: string, tier: Fixture['tier'], purpose: string, rows: ChangesRowSpec[]): Fixture => {
  const dateFrom = '2026-02-01';
  const dateTo = '2026-02-28';
  return { id, tier, purpose, input: { jobType: 'changesReport', dateFrom, dateTo, rows }, expect: changesExpectations(rows, dateFrom, dateTo) };
};

// ------------------------------------------------------------------ petition outcomes

const candidateToken = (i: number) => `CAND${String(i).padStart(5, '0')}`;
const OUTCOMES: Outcome[] = ['Won', 'Unopposed', 'Tie', 'Lost'];
const COLOR: Record<Outcome, 'green' | 'amber' | 'white'> = { Won: 'green', Unopposed: 'green', Tie: 'amber', Lost: 'white' };

function outcomeRows(count: number, opts: { long?: boolean } = {}): OutcomeRowSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    committeeListId: 1 + Math.floor(i / 4),
    cityTown: 'BRIGHTON',
    legDistrict: 16,
    electionDistrict: 1 + Math.floor(i / 4),
    seatNumber: 1 + (i % 4),
    candidateName: `${candidateToken(i + 1)} ${opts.long && i % 5 === 0 ? 'ALEXANDRA-KATHERINE MONTGOMERY-WORTHINGTON III' : 'TESTER'}`,
    voteCount: i % 7 === 0 ? null : 100 + i,
    outcome: OUTCOMES[i % OUTCOMES.length]!,
    primaryDate: i % 6 === 0 ? null : '2026-06-23',
  }));
}

function outcomesExpectations(rows: OutcomeRowSpec[]): Expectations {
  const ordered = [...rows].sort(
    (a, b) => (a.cityTown < b.cityTown ? -1 : a.cityTown > b.cityTown ? 1 : 0) || a.legDistrict - b.legDistrict || a.electionDistrict - b.electionDistrict,
  );
  const headings = [...new Set(ordered.map((r) => `City/Town: ${r.cityTown}, LD ${r.legDistrict}, ED ${r.electionDistrict}`))];
  return flowing(['Petition Outcomes Report', ...headings], ordered.map((r) => r.candidateName.split(' ')[0]!), {
    colorSamples: OUTCOMES.map((word) => ({ word, expected: COLOR[word], occurrences: rows.filter((r) => r.outcome === word).length })).filter((s) => s.occurrences > 0),
  });
}

const outcomesFixture = (id: string, tier: Fixture['tier'], purpose: string, rows: OutcomeRowSpec[]): Fixture => ({
  id,
  tier,
  purpose,
  input: { jobType: 'petitionOutcomesReport', rows },
  expect: outcomesExpectations(rows),
});

export const vacancyFamily: FixtureFamily = {
  family: 'vacancy',
  jobTypes: ['vacancyReport'],
  fixtures: [
    vacancyFixture('vacancy-quick', 'quick', '4 rows in one group', vacancyRows('BRIGHTON', 16, 4, 9001)),
    vacancyFixture('vacancy-200', 'full', '200 rows across 4 groups, zero/partial/full vacancies, independent totals', [
      ...vacancyRows('ROCHESTER', 22, 50, 9101),
      ...vacancyRows('BRIGHTON', 16, 50, 9201),
      ...vacancyRows('ROCHESTER', 21, 50, 9301),
      ...vacancyRows('HENRIETTA', 17, 50, 9401),
    ]),
    vacancyFixture('vacancy-empty', 'full', 'No rows: header and a zero grand total', []),
  ],
};

export const changesFamily: FixtureFamily = {
  family: 'changes',
  jobTypes: ['changesReport'],
  fixtures: [
    changesFixture('changes-quick', 'quick', '4 short rows on fixed dates', changesRows(4)),
    changesFixture('changes-200', 'full', '200 rows over 4 dates, every change type, long details', changesRows(200, { long: true })),
    changesFixture('changes-empty', 'full', 'No rows: title, range and an empty table', []),
  ],
};

export const outcomesFamily: FixtureFamily = {
  family: 'petition-outcomes',
  jobTypes: ['petitionOutcomesReport'],
  fixtures: [
    outcomesFixture('outcomes-quick', 'quick', '4 rows: Won, Unopposed, Tie, Lost', outcomeRows(4)),
    outcomesFixture('outcomes-200', 'full', '200 rows across 50 committees, long names, outcome colours', outcomeRows(200, { long: true })),
    outcomesFixture('outcomes-empty', 'full', 'No rows: title and footer only', []),
  ],
};
