import { PAPER } from '../common';
import { memberToken, members, range } from './shared';
import type { CommitteeSpec, Expectations, Fixture, FixtureFamily, FixtureInput, MemberSpec } from './types';

/** Independent of the production helper: 7 rows under the title, 8 on later pages. */
const FIRST_PAGE_ROWS = 7;
const ROWS_PER_PAGE = 8;
const MEETING = 'MCDC Reorganization Meeting';
/** latestImportCompletedAt below, as the footer prints it (America/New_York, numeric). */
const IMPORT_AT = '2026-02-20T18:00:00.000Z';
const CONTACT_DATE = '2/20/2026';

type SignInInput = Extract<FixtureInput, { jobType: 'signInSheet' }>;

const titleCase = (s: string) =>
  s
    .split(' ')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');

/** One sheet per town, or per LD in Rochester, in input order. */
function sheetsOf(input: SignInInput) {
  const sheets: { key: string; label: string; members: MemberSpec[] }[] = [];
  for (const c of input.committees) {
    const key = c.cityTown === 'ROCHESTER' ? `${c.cityTown}|${c.legDistrict}` : c.cityTown;
    let sheet = sheets.find((s) => s.key === key);
    if (!sheet) {
      const narrowed = input.scope === 'jurisdiction' && input.cityTown != null && input.legDistrict != null;
      const label =
        c.cityTown === 'ROCHESTER'
          ? `Rochester LD ${c.legDistrict}`
          : narrowed
            ? `${titleCase(c.cityTown)} LD ${input.legDistrict}`
            : titleCase(c.cityTown);
      sheets.push((sheet = { key, label, members: [] }));
    }
    sheet.members.push(...c.members);
  }
  return sheets;
}

function signInExpectations(input: SignInInput, extra: Partial<Expectations> = {}): Expectations {
  const reportName = input.meetingName ? `${input.meetingName} Sign-In Sheet` : 'Sign-In Sheet';
  const pages: { tokens: string[]; text: string[] }[] = [];
  for (const sheet of sheetsOf(input)) {
    // Every fixture member has last name TESTER and a token first name, so order is by token.
    const tokens = sheet.members.map((m) => memberToken(m.n)).sort();
    const chunks = [tokens.slice(0, FIRST_PAGE_ROWS)];
    for (let i = FIRST_PAGE_ROWS; i < tokens.length; i += ROWS_PER_PAGE) chunks.push(tokens.slice(i, i + ROWS_PER_PAGE));
    chunks.forEach((chunk, i) => {
      pages.push({
        tokens: chunk,
        text: [
          ...(i === 0 ? [`${sheet.label} Committee`] : []),
          `${sheet.label} Democratic Committee | ${reportName} | ${tokens.length} eligible members | Contact info as of ${CONTACT_DATE}`,
          `Page ${i + 1}`,
        ],
      });
    });
  }
  const tokens = pages.flatMap((p) => p.tokens);
  return {
    paper: PAPER.legalLandscape,
    pages: pages.length,
    pageTokens: pages.map((p) => p.tokens),
    tokenCounts: Object.fromEntries(tokens.map((t) => [t, 1])),
    orderedTokens: tokens,
    required: [],
    requiredOnPage: pages.flatMap((p, i) => p.text.map((text) => ({ page: i + 1, text }))),
    ...extra,
  };
}

function signInFixture(id: string, tier: Fixture['tier'], purpose: string, input: Omit<SignInInput, 'jobType' | 'latestImportCompletedAt'>, extra?: Partial<Expectations>): Fixture {
  const full: SignInInput = { jobType: 'signInSheet', latestImportCompletedAt: IMPORT_AT, ...input };
  return { id, tier, purpose, input: full, expect: signInExpectations(full, extra) };
}

const brighton = (members: MemberSpec[]): CommitteeSpec => ({ cityTown: 'BRIGHTON', legDistrict: 16, electionDistrict: 1, members });

const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
const wrapMembers: MemberSpec[] = range(2001, 7).map((n) => ({
  n,
  last: 'MONTGOMERY-WORTHINGTON ALEXANDRA KATHERINE',
  email: `${memberToken(n).toLowerCase()}${ALPHA}${ALPHA}@example.invalid`,
}));

export const signInFamily: FixtureFamily = {
  family: 'sign-in',
  jobTypes: ['signInSheet'],
  fixtures: [
    signInFixture('signin-quick', 'quick', '7 members on one sheet; 1 page', { scope: 'countywide', meetingName: MEETING, committees: [brighton(members(1, 7))] }),
    signInFixture('signin-0', 'full', 'Empty sheet: title, header and footer, no rows; 1 page', { scope: 'countywide', meetingName: MEETING, committees: [brighton([])] }),
    signInFixture(
      'signin-8-missing-contacts',
      'full',
      '8 members without email or phone: 7 + 1 rows on 2 pages; "None on file" 16 times',
      { scope: 'countywide', meetingName: MEETING, committees: [brighton(members(101, 8, { email: null, telephone: null }))] },
      { tokenCounts: { ...Object.fromEntries(range(101, 8).map((n) => [memberToken(n), 1])), 'None on file': 16 } },
    ),
    signInFixture('signin-17', 'full', '17 members: 7 + 8 + 2 rows on 3 pages', { scope: 'countywide', meetingName: MEETING, committees: [brighton(members(201, 17))] }),
    signInFixture('signin-151', 'full', '151 members: 7 then 8 per page; 19 pages', { scope: 'countywide', meetingName: MEETING, committees: [brighton(members(301, 151))] }),
    signInFixture('signin-multi-jurisdiction', 'full', 'Brighton (17) then Rochester LD 26 (1): page numbers reset per sheet; 4 pages', {
      scope: 'countywide',
      meetingName: MEETING,
      committees: [
        brighton(members(501, 9)),
        { cityTown: 'BRIGHTON', legDistrict: 16, electionDistrict: 2, members: members(510, 8) },
        { cityTown: 'ROCHESTER', legDistrict: 26, electionDistrict: 3, members: members(601, 1) },
      ],
    }),
    signInFixture(
      'signin-wrap',
      'full',
      'Narrowed-town title, long meeting name and date, long wrapping names and emails',
      {
        scope: 'jurisdiction',
        cityTown: 'EAST ROCHESTER',
        legDistrict: 26,
        meetingName: `${'Reorganization '.repeat(6)}Meeting`,
        meetingDate: '2026-03-15',
        committees: [{ cityTown: 'EAST ROCHESTER', legDistrict: 26, electionDistrict: 1, members: wrapMembers }],
      },
      { required: ['March 15, 2026'], reviewNotes: ['Long names and emails wrap or shrink inside their cells; nothing overlaps the signature columns.'] },
    ),
  ],
};
