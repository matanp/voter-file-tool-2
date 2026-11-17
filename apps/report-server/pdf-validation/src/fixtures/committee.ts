import { PAPER } from '../common';
import { FIXED_DATE_LONG, edsOf, memberPhone, memberToken, members, range } from './shared';
import type { CommitteeSpec, Expectations, Fixture, FixtureFamily, MemberSpec } from './types';

/**
 * Legacy committees (`ldCommittees`) and the configurable roster (`committeeRoster`) share
 * CommitteeReport. Expectations are computed here, independently of the production paginator:
 * a page holds 30 units, each member is one unit and each ED group costs one more.
 */
const PAGE_BUDGET = 30;
const TITLE = 'Monroe County Democratic Committee List as of May 15, 2025';

type RosterColumn = 'name' | 'address' | 'mailingAddress' | 'telephone' | 'email';
const HEADER: Record<RosterColumn, string> = {
  name: 'Name',
  address: 'Address',
  mailingAddress: 'Mailing Address',
  telephone: 'Phone',
  email: 'Email',
};
const ALL: RosterColumn[] = ['name', 'address', 'mailingAddress', 'telephone', 'email'];
const DEFAULT_PDF: RosterColumn[] = ['name', 'address', 'telephone'];

/** The job payload that turns exactly `columns` on (Name is always on). */
function rosterSelection(columns: RosterColumn[]) {
  return {
    includeFields: columns.filter((c) => c === 'telephone' || c === 'email'),
    includeCompoundFields: {
      name: true,
      address: columns.includes('address'),
      mailingAddress: columns.includes('mailingAddress'),
    },
  };
}

const ldLabel = (cityTown: string, legDistrict: number): string =>
  cityTown === 'ROCHESTER' ? `LD ${String(legDistrict).padStart(2, '0')}` : cityTown;

type ExpectedPage = { label: string; tokens: string[]; subtotal: number | null };

export function expectedCommitteePages(committees: CommitteeSpec[]): ExpectedPage[] {
  // Jurisdictions keep first-seen order; EDs within one sort numerically (they are object keys).
  const lds: { cityTown: string; legDistrict: number; eds: CommitteeSpec[] }[] = [];
  for (const c of committees) {
    if (c.members.length === 0) continue; // empty EDs are dropped from the report
    let ld = lds.find((l) => l.cityTown === c.cityTown && l.legDistrict === c.legDistrict);
    if (!ld) lds.push((ld = { cityTown: c.cityTown, legDistrict: c.legDistrict, eds: [] }));
    ld.eds.push(c);
  }
  const pages: ExpectedPage[] = [];
  for (const ld of lds) {
    const label = ldLabel(ld.cityTown, ld.legDistrict);
    const eds = [...ld.eds].sort((a, b) => a.electionDistrict - b.electionDistrict);
    const ldPages: ExpectedPage[] = [];
    let current: CommitteeSpec[] = [];
    const units = (group: CommitteeSpec[]) => group.reduce((sum, e) => sum + e.members.length + 1, 0);
    const flush = () => {
      if (current.length) ldPages.push({ label, tokens: current.flatMap((e) => e.members.map((m) => memberToken(m.n))), subtotal: null });
      current = [];
    };
    for (const ed of eds) {
      const cost = ed.members.length + 1;
      if (units(current) + cost > PAGE_BUDGET) flush();
      if (cost > PAGE_BUDGET) {
        for (let i = 0; i < ed.members.length; i += PAGE_BUDGET - 1) {
          const chunk = ed.members.slice(i, i + PAGE_BUDGET - 1);
          ldPages.push({ label, tokens: chunk.map((m) => memberToken(m.n)), subtotal: null });
        }
      } else {
        current.push(ed);
      }
    }
    flush();
    const last = ldPages[ldPages.length - 1];
    if (last) last.subtotal = ld.eds.reduce((sum, e) => sum + e.members.length, 0);
    pages.push(...ldPages);
  }
  return pages;
}

function committeeExpectations(
  committees: CommitteeSpec[],
  opts: { columns?: RosterColumn[]; extraRequired?: string[]; forbidden?: string[]; allowedTruncation?: RosterColumn[]; reviewNotes?: string[] },
): Expectations {
  const pages = expectedCommitteePages(committees);
  const tokens = pages.flatMap((p) => p.tokens);
  const headers = opts.columns ? ['Serve ED', ...opts.columns.map((c) => HEADER[c])] : ['Serve ED', 'Name', 'Address', 'City', 'State', 'Zip', 'Phone'];
  const forbiddenHeaders = opts.columns ? ALL.filter((c) => !opts.columns!.includes(c)).map((c) => HEADER[c]) : [];
  return {
    paper: PAPER.letterLandscape,
    pages: pages.length,
    pageTokens: pages.map((p) => p.tokens),
    tokenCounts: Object.fromEntries(tokens.map((t) => [t, 1])),
    orderedTokens: tokens,
    required: [TITLE, FIXED_DATE_LONG, ...(opts.extraRequired ?? [])],
    requiredOnPage: pages.flatMap((p, i) => [
      { page: i + 1, text: p.label },
      { page: i + 1, text: headers.join(' ') },
      { page: i + 1, text: `Page ${i + 1} of ${pages.length}` },
      ...(p.subtotal !== null ? [{ page: i + 1, text: `Committee Subtotal: ${p.subtotal}` }] : []),
    ]),
    // "Address" is a substring of "Mailing Address", so only forbid it when neither is shown.
    forbidden: [
      ...forbiddenHeaders.filter((h) => !(h === 'Address' && opts.columns?.includes('mailingAddress'))),
      ...(opts.forbidden ?? []),
    ],
    allowedTruncation: opts.allowedTruncation,
    reviewNotes: opts.reviewNotes,
  };
}

function rosterFixture(
  id: string,
  tier: Fixture['tier'],
  purpose: string,
  columns: RosterColumn[],
  committees: CommitteeSpec[],
  opts: Parameters<typeof committeeExpectations>[1] = {},
): Fixture {
  return {
    id,
    tier,
    purpose,
    input: { jobType: 'committeeRoster', committees, ...rosterSelection(columns) },
    expect: committeeExpectations(committees, { ...opts, columns }),
  };
}

function legacyFixture(id: string, tier: Fixture['tier'], purpose: string, committees: CommitteeSpec[]): Fixture {
  return {
    id,
    tier,
    purpose,
    input: { jobType: 'ldCommittees', committees },
    expect: committeeExpectations(committees, {
      reviewNotes: ['Legacy columns wrap instead of truncating; check that no row runs past the page footer.'],
    }),
  };
}

const LONG_EMAIL = `${memberToken(601).toLowerCase()}.${'x'.repeat(52)}@example.invalid`;
const FOREIGN = { lines: ['FLAT 12B, KENSINGTON COURT', '45 QUEENS GATE TERRACE', 'LONDON SW7 5PR', 'UNITED KINGDOM'], city: '', state: '', zip: '' };
const longValueMembers: MemberSpec[] = range(601, 6).map((n) => ({
  n,
  middle: 'Q',
  last: 'ALEXANDRA-KATHERINE MONTGOMERY-WORTHINGTON',
  suffix: 'III',
  houseNum: 12345,
  street: 'NORTH WINTON ROAD EXTENSION SOUTHWEST',
  email: n === 601 ? LONG_EMAIL : `${memberToken(n).toLowerCase()}.${'y'.repeat(40)}@example.invalid`,
  mailing: FOREIGN,
}));

const missingContactMembers: MemberSpec[] = [
  { n: 701, telephone: null },
  { n: 702, email: null },
  { n: 703, mailing: null },
  { n: 704, telephone: null, email: null, mailing: null },
  { n: 705, telephone: '', email: '', mailing: { lines: [], city: '', state: '', zip: '' } },
  { n: 706 },
];

/** 800 EDs x 4 members: 6 EDs (30 units) per page, so ceil(800 / 6) = 134 pages. */
const LARGE = edsOf('BRIGHTON', 16, 1, Array<number>(800).fill(4), 10_001);

export const committeeFamily: FixtureFamily = {
  family: 'committees',
  jobTypes: ['ldCommittees', 'committeeRoster'],
  fixtures: [
    rosterFixture('roster-quick', 'quick', 'One ED, 4 members, default PDF columns; 1 page', DEFAULT_PDF, [
      { cityTown: 'ROCHESTER', legDistrict: 1, electionDistrict: 5, members: members(1, 4) },
    ]),
    legacyFixture('legacy-quick', 'quick', 'Legacy columns, one ED, 4 members; 1 page', [
      { cityTown: 'ROCHESTER', legDistrict: 1, electionDistrict: 5, members: members(1, 4) },
    ]),
    rosterFixture('roster-ed29', 'full', 'One ED of 29 members fills the 30-unit budget; 1 page; all columns', ALL, [
      { cityTown: 'ROCHESTER', legDistrict: 2, electionDistrict: 7, members: members(101, 29) },
    ]),
    rosterFixture('roster-ed45-split', 'full', 'One ED of 45 members splits 29 + 16; 2 pages', DEFAULT_PDF, [
      { cityTown: 'ROCHESTER', legDistrict: 2, electionDistrict: 8, members: members(201, 45) },
    ]),
    ...(
      [
        ['min', ['name']],
        ['default', DEFAULT_PDF],
        ['all', ALL],
      ] as const
    ).map(([name, columns]) =>
      rosterFixture(`roster-cols-${name}`, 'full', `Column set ${name}: ${columns.join(', ')}`, [...columns], edsOf('ROCHESTER', 4, 1, [4, 6, 5], 301)),
    ),
    rosterFixture(
      'roster-long-values',
      'full',
      'Long names, streets, an 80-character email and a 4-line foreign mailing address; all columns truncate on one line',
      ALL,
      [{ cityTown: 'ROCHESTER', legDistrict: 3, electionDistrict: 9, members: longValueMembers }],
      {
        allowedTruncation: ['name', 'address', 'mailingAddress', 'email'],
        reviewNotes: ['Truncated cells must end in an ellipsis inside their column, never overlap the next column.'],
      },
    ),
    rosterFixture(
      'roster-missing-contacts',
      'full',
      'Members missing phone, email or mailing address (null and empty-string variants); all columns',
      ALL,
      [{ cityTown: 'PITTSFORD', legDistrict: 15, electionDistrict: 4, members: missingContactMembers }],
      {
        // The members that have a phone show it; the ones without must not borrow another's.
        extraRequired: missingContactMembers.filter((m) => memberPhone(m)).map((m) => memberPhone(m)!),
        forbidden: ['(585)555-0701', '(585)555-0704', '(585)555-0705', 'PO BOX 703', 'PO BOX 704', 'PO BOX 705'],
      },
    ),
    rosterFixture('roster-large-800x4', 'full', '800 EDs x 4 members in one jurisdiction; 134 pages; default columns', DEFAULT_PDF, LARGE),
    legacyFixture('legacy-large-800x4', 'full', 'Legacy mode, 800 EDs x 4 members; 134 pages', LARGE),
  ],
};
