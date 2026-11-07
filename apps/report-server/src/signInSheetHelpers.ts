import { resolveMemberContact } from './memberContact';

/** The first page also carries the title, so it holds one row fewer (as in the reference sheet). */
export const SIGN_IN_SHEET_FIRST_PAGE_ROWS = 7;
export const SIGN_IN_SHEET_ROWS_PER_PAGE = 8;

const ROCHESTER = 'ROCHESTER';
const CONTACT_DATE_TIME_ZONE = 'America/New_York';
const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export type SignInSheetRow = {
  electionDistrict: number;
  name: string;
  email: string | null;
  phone: string | null;
};

/** One committee's sheet: a town, or an LD for Rochester. */
export type SignInSheetData = {
  committeeLabel: string;
  rows: SignInSheetRow[];
};

type SignInSheetVoter = {
  VRCNUM: string;
  lastName: string | null;
  firstName: string | null;
  middleInitial: string | null;
  suffixName: string | null;
  email: string | null;
  telephone: string | null;
};

export type SignInSheetCommitteeInput = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  memberships?: { submissionMetadata: unknown; voterRecord: SignInSheetVoter }[];
};

/** The job's resolved jurisdiction. Empty on a countywide job. */
export type SignInSheetTitleScope = {
  cityTown?: string;
  legDistrict?: number;
};

/**
 * A countywide job ignores `cityTown` and `legDistrict` when fetching, though
 * the schema accepts them, so they must not reach the sheet titles either.
 */
export const resolveSignInSheetTitleScope = ({
  scope,
  cityTown,
  legDistrict,
}: SignInSheetTitleScope & {
  scope: 'jurisdiction' | 'countywide';
}): SignInSheetTitleScope =>
  scope === 'jurisdiction' ? { cityTown, legDistrict } : {};

const titleCaseWords = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');

const committeeLabelFor = (
  cityTown: string,
  legDistrict: number,
  titleScope: SignInSheetTitleScope,
): string => {
  if (cityTown === ROCHESTER) return `Rochester LD ${legDistrict}`;
  const town = titleCaseWords(cityTown);
  return titleScope.cityTown != null && titleScope.legDistrict != null
    ? `${town} LD ${titleScope.legDistrict}`
    : town;
};

const trimmedPart = (part: string | null): string => part?.trim() ?? '';

/** Formats `LAST, FIRST M SUFFIX`, dropping blank parts and any initial's period. */
export function formatMemberName(
  voter: Pick<
    SignInSheetVoter,
    'lastName' | 'firstName' | 'middleInitial' | 'suffixName'
  >,
): string {
  const lastName = trimmedPart(voter.lastName);
  const givenNames = [
    trimmedPart(voter.firstName),
    trimmedPart(voter.middleInitial).replace(/\.$/, ''),
    trimmedPart(voter.suffixName),
  ]
    .filter(Boolean)
    .join(' ');

  return lastName && givenNames
    ? `${lastName}, ${givenNames}`
    : lastName || givenNames;
}

/** Formats a US number as `(585) 555-1234`. Other values stay as stored; blank is null. */
export function formatPhone(phone: string | null): string | null {
  const trimmed = trimmedPart(phone);
  if (trimmed === '') return null;

  const digits = trimmed.replace(/\D/g, '');
  const national =
    digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (national.length !== 10) return trimmed;

  return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
}

const compareText = (a: string | null, b: string | null): number =>
  (a ?? '').localeCompare(b ?? '', 'en', { sensitivity: 'base' });

type SheetMember = {
  voter: SignInSheetVoter;
  legDistrict: number;
  row: SignInSheetRow;
};

const compareMembers = (a: SheetMember, b: SheetMember): number =>
  compareText(a.voter.lastName, b.voter.lastName) ||
  compareText(a.voter.firstName, b.voter.firstName) ||
  compareText(a.voter.middleInitial, b.voter.middleInitial) ||
  a.legDistrict - b.legDistrict ||
  a.row.electionDistrict - b.row.electionDistrict ||
  compareText(a.voter.VRCNUM, b.voter.VRCNUM);

/**
 * Groups committee rows into one sheet per town, or per LD for Rochester, with
 * members sorted across the whole sheet. Sheets keep the input's order, which
 * `fetchSignInSheetData` sorts by cityTown then legDistrict.
 */
export function buildSignInSheets(
  committees: SignInSheetCommitteeInput[],
  titleScope: SignInSheetTitleScope = {},
): SignInSheetData[] {
  const sheets = new Map<
    string,
    { committeeLabel: string; members: SheetMember[] }
  >();

  for (const committee of committees) {
    const { cityTown, legDistrict, electionDistrict } = committee;
    const key =
      cityTown === ROCHESTER ? `${cityTown}|${legDistrict}` : cityTown;

    let sheet = sheets.get(key);
    if (!sheet) {
      sheet = {
        committeeLabel: committeeLabelFor(cityTown, legDistrict, titleScope),
        members: [],
      };
      sheets.set(key, sheet);
    }

    for (const membership of committee.memberships ?? []) {
      const { email, telephone } = resolveMemberContact(membership);
      sheet.members.push({
        voter: membership.voterRecord,
        legDistrict,
        row: {
          electionDistrict,
          name: formatMemberName(membership.voterRecord),
          email: trimmedPart(email) || null,
          phone: formatPhone(telephone),
        },
      });
    }
  }

  return Array.from(sheets.values(), ({ committeeLabel, members }) => ({
    committeeLabel,
    rows: [...members].sort(compareMembers).map(({ row }) => row),
  }));
}

/**
 * Splits rows into pages: 7 on the first page, 8 on each later one. A sheet
 * with no rows still gets one empty page.
 */
export function paginateSignInSheetRows(
  rows: SignInSheetRow[],
): SignInSheetRow[][] {
  const pages: SignInSheetRow[][] = [rows.slice(0, SIGN_IN_SHEET_FIRST_PAGE_ROWS)];
  for (
    let i = SIGN_IN_SHEET_FIRST_PAGE_ROWS;
    i < rows.length;
    i += SIGN_IN_SHEET_ROWS_PER_PAGE
  ) {
    pages.push(rows.slice(i, i + SIGN_IN_SHEET_ROWS_PER_PAGE));
  }
  return pages;
}

/**
 * Formats a Calendar Date (`YYYY-MM-DD`) as `March 15, 2026` from its parts.
 * `new Date(iso)` would parse UTC midnight and print the day before in a
 * UTC-negative timezone.
 */
export function formatCalendarDate(calendarDate: string): string {
  const match = CALENDAR_DATE_PATTERN.exec(calendarDate);
  const month = match ? MONTH_NAMES[Number(match[2]) - 1] : undefined;
  if (!match || !month) return '';
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

export function formatMeetingLine(
  meetingName?: string,
  meetingDate?: string,
): string {
  return [meetingName, meetingDate ? formatCalendarDate(meetingDate) : '']
    .filter(Boolean)
    .join(' — ');
}

/**
 * Formats the footer's "Contact info as of" date: when the BOE data was last
 * imported, or `now` if it never was. The zone is explicit because the report
 * server has no `TZ` set.
 */
export function formatContactInfoDate(
  latestImportCompletedAt: Date | null,
  now: Date,
): string {
  return (latestImportCompletedAt ?? now).toLocaleDateString('en-US', {
    timeZone: CONTACT_DATE_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
}
