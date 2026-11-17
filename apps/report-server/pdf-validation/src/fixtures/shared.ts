import type { CommitteeSpec, MailingSpec, MemberSpec } from './types';

/**
 * Fixed inputs every fixture shares. The worker freezes the clock at FIXED_NOW while it
 * builds HTML and runs in TZ=UTC, so the footer date is FIXED_DATE_LONG.
 */
export const FIXED_NOW = '2026-03-02T15:00:00.000Z';
/** FIXED_NOW formatted as the reports' footers print it, written out independently. */
export const FIXED_DATE_LONG = 'Monday, March 2, 2026';
export const REPORT_AUTHOR = 'Validation Author';

/** Fixed-width so no token is a prefix of another. */
export const memberToken = (n: number): string => `MEMBER${String(n).padStart(5, '0')}`;
export const range = (from: number, count: number): number[] => Array.from({ length: count }, (_, i) => from + i);
export const members = (from: number, count: number, extra: Partial<MemberSpec> = {}): MemberSpec[] =>
  range(from, count).map((n) => ({ n, ...extra }));

/** Several EDs in one jurisdiction; member numbers continue across EDs. */
export function edsOf(cityTown: string, legDistrict: number, firstEd: number, sizes: number[], startN: number): CommitteeSpec[] {
  let n = startN;
  return sizes.map((size, i) => {
    const committee = { cityTown, legDistrict, electionDistrict: firstEd + i, members: members(n, size) };
    n += size;
    return committee;
  });
}

const DEFAULT_MAILING = (n: number): MailingSpec => ({ lines: [`PO BOX ${n}`], city: 'ROCHESTER', state: 'NY', zip: '14603' });

export const memberFirst = (m: MemberSpec): string => m.first ?? memberToken(m.n);
export const memberLast = (m: MemberSpec): string => m.last ?? 'TESTER';
/** Formatted like real BOE phones. */
export const memberPhone = (m: MemberSpec): string | null =>
  m.telephone === undefined ? `(585)555-${String(m.n % 10_000).padStart(4, '0')}` : m.telephone;
export const memberEmail = (m: MemberSpec): string | null =>
  m.email === undefined ? `${memberToken(m.n).toLowerCase()}@example.invalid` : m.email;
export const memberMailing = (m: MemberSpec): MailingSpec | null => (m.mailing === undefined ? DEFAULT_MAILING(m.n) : m.mailing);

/**
 * The synthetic VoterRecord the worker hands the deployed helpers. Only the fields the PDF
 * paths read are set; everything else is absent, as no report reads it.
 */
export function voterRecordOf(m: MemberSpec): Record<string, unknown> {
  const mailing = memberMailing(m);
  return {
    VRCNUM: `V${String(m.n).padStart(8, '0')}`,
    firstName: memberFirst(m),
    middleInitial: m.middle ?? null,
    lastName: memberLast(m),
    suffixName: m.suffix ?? null,
    houseNum: m.houseNum ?? m.n,
    street: m.street ?? 'MAIN ST',
    apartment: null,
    halfAddress: null,
    resAddrLine2: null,
    resAddrLine3: null,
    city: 'ROCHESTER',
    state: 'NY',
    zipCode: '14604',
    zipSuffix: null,
    telephone: memberPhone(m),
    email: memberEmail(m),
    mailingAddress1: mailing?.lines[0] ?? null,
    mailingAddress2: mailing?.lines[1] ?? null,
    mailingAddress3: mailing?.lines[2] ?? null,
    mailingAddress4: mailing?.lines[3] ?? null,
    mailingCity: mailing ? mailing.city : null,
    mailingState: mailing ? mailing.state : null,
    mailingZip: mailing ? mailing.zip : null,
    mailingZipSuffix: null,
    DOB: null,
    lastUpdate: null,
    originalRegDate: null,
  };
}

/** Counts each token once per expected occurrence. */
export function countsOf(tokens: string[], times = 1): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of tokens) counts[t] = (counts[t] ?? 0) + times;
  return counts;
}
