import { PAPER } from '../common';
import { FIXED_DATE_LONG, REPORT_AUTHOR } from './shared';
import type { Expectations, Fixture, FixtureFamily, FixtureInput, Scope, SeatSpec, WeightSummarySpec } from './types';

/** Independent of the component: 20 committee rows per page, each group starts a new page. */
const ROWS_PER_PAGE = 20;

type WeightInput = Extract<FixtureInput, { jobType: 'designationWeightSummary' }>;

/**
 * Designation weights double as row tokens: 7000.25, 7001.25, ... are unique, exact in
 * binary, and can't collide with seat counts, LTED and base weights (< 2) or the much larger totals.
 */
const weightToken = (i: number) => 7000 + i + 0.25;
const SEAT_WEIGHT = 0.25;

function seats(i: number): SeatSpec[] {
  // Four seats; the pattern varies the petitioned/occupied/appointed counts per row.
  return [1, 2, 3, 4].map((seatNumber) => ({
    seatNumber,
    isPetitioned: seatNumber <= 2 + (i % 3 === 0 ? 1 : 0),
    isOccupied: (seatNumber + i) % 2 === 0,
    occupantMembershipType: (seatNumber + i) % 2 === 0 ? (seatNumber === 4 ? 'APPOINTED' : 'PETITIONED') : null,
    seatWeight: SEAT_WEIGHT,
  }));
}

/** `count` committees in one jurisdiction; `start` numbers the tokens across groups. */
function group(cityTown: string, legDistrict: number, count: number, start: number, missingEvery = 0): WeightSummarySpec[] {
  return Array.from({ length: count }, (_, k) => {
    const i = start + k;
    const missing = missingEvery > 0 && k % missingEvery === 0 ? [4] : [];
    return {
      cityTown,
      legDistrict,
      electionDistrict: k + 1,
      ltedWeight: SEAT_WEIGHT,
      totalWeight: weightToken(i),
      seats: seats(i).map((s) => (missing.includes(s.seatNumber) ? { ...s, seatWeight: null } : s)),
      missingWeightSeatNumbers: missing,
    };
  });
}

const money = (n: number) => n.toFixed(2);
const pad3 = (n: number) => String(n).padStart(3, '0');

function weightExpectations(input: WeightInput): Expectations {
  const scope =
    input.scope === 'countywide'
      ? 'Countywide'
      : input.cityTown === 'ROCHESTER' && input.legDistrict != null
        ? `${input.cityTown} LD ${String(input.legDistrict).padStart(2, '0')}`
        : (input.cityTown ?? 'Jurisdiction');
  const groups: { label: string; rows: WeightSummarySpec[] }[] = [];
  for (const s of input.summaries) {
    const label =
      s.cityTown === 'ROCHESTER'
        ? `City/Town: ${s.cityTown}, Legislative District: ${String(s.legDistrict).padStart(2, '0')}`
        : `City/Town: ${s.cityTown}, Legislative District: ${s.legDistrict}`;
    let g = groups.find((x) => x.label === label);
    if (!g) groups.push((g = { label, rows: [] }));
    g.rows.push(s);
  }
  const pages: { tokens: string[]; text: string[] }[] = [];
  let grand = 0;
  for (const g of groups) {
    const subtotal = g.rows.reduce((sum, r) => sum + r.totalWeight, 0);
    grand += subtotal;
    for (let i = 0; i < g.rows.length; i += ROWS_PER_PAGE) {
      const chunk = g.rows.slice(i, i + ROWS_PER_PAGE);
      const last = i + ROWS_PER_PAGE >= g.rows.length;
      pages.push({ tokens: chunk.map((r) => money(r.totalWeight)), text: [g.label, ...(last ? [`Subtotal ${money(subtotal)}`] : [])] });
    }
  }
  const missing = input.summaries.filter((s) => s.missingWeightSeatNumbers.length > 0);
  const lastPage = pages[pages.length - 1];
  if (lastPage) {
    lastPage.text.push(`Grand Total: ${money(grand)}`);
    if (missing.length) {
      lastPage.text.push(
        `Committees with missing weights: ${missing.map((s) => `${s.cityTown} LD${s.legDistrict} ED${pad3(s.electionDistrict)}`).join('; ')}`,
      );
    }
  }
  const tokens = pages.flatMap((p) => p.tokens);
  return {
    paper: PAPER.letterLandscape,
    pages: pages.length,
    pageTokens: pages.map((p) => p.tokens),
    tokenCounts: Object.fromEntries(tokens.map((t) => [t, 1])),
    orderedTokens: tokens,
    required: [`Designation Weight Summary — ${scope} — ${FIXED_DATE_LONG}`, REPORT_AUTHOR],
    requiredOnPage: pages.flatMap((p, i) => [...p.text, `Page ${i + 1} of ${pages.length}`].map((text) => ({ page: i + 1, text }))),
    forbidden: missing.length ? [] : ['Committees with missing weights'],
  };
}

function weightFixture(id: string, tier: Fixture['tier'], purpose: string, scope: Scope, summaries: WeightSummarySpec[], where: { cityTown?: string; legDistrict?: number } = {}): Fixture {
  const input: WeightInput = { jobType: 'designationWeightSummary', scope, ...where, summaries };
  return { id, tier, purpose, input, expect: weightExpectations(input) };
}

export const weightSummaryFamily: FixtureFamily = {
  family: 'weight-summary',
  jobTypes: ['designationWeightSummary'],
  fixtures: [
    weightFixture('weights-quick', 'quick', 'One jurisdiction, 4 rows; 1 page', 'jurisdiction', group('BRIGHTON', 16, 4, 0), { cityTown: 'BRIGHTON' }),
    weightFixture('weights-20', 'full', '20 rows: the last that fit on one page', 'jurisdiction', group('BRIGHTON', 16, 20, 100), { cityTown: 'BRIGHTON' }),
    weightFixture('weights-21', 'full', '21 rows: 20 + 1 on 2 pages', 'jurisdiction', group('BRIGHTON', 16, 21, 200), { cityTown: 'BRIGHTON' }),
    weightFixture('weights-200', 'full', '200 rows in one group; 10 pages', 'jurisdiction', group('ROCHESTER', 5, 200, 300), { cityTown: 'ROCHESTER', legDistrict: 5 }),
    weightFixture(
      'weights-multi-group',
      'full',
      'Countywide, 3 groups (25 / 3 / 12 rows) with missing seat weights; independent subtotals and grand total',
      'countywide',
      [...group('BRIGHTON', 16, 25, 600, 10), ...group('HENRIETTA', 17, 3, 700), ...group('ROCHESTER', 22, 12, 800, 5)],
    ),
  ],
};
