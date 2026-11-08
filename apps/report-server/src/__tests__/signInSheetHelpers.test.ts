import {
  buildSignInSheets,
  formatCalendarDate,
  formatContactInfoDate,
  formatMeetingLine,
  formatMemberName,
  formatPhone,
  paginateSignInSheetRows,
  resolveSignInSheetTitleScope,
  type SignInSheetCommitteeInput,
  type SignInSheetRow,
} from '../signInSheetHelpers';

type Voter = NonNullable<
  SignInSheetCommitteeInput['memberships']
>[number]['voterRecord'];

const member = (voter: Partial<Voter>, submissionMetadata: unknown = null) => ({
  submissionMetadata,
  voterRecord: {
    VRCNUM: 'V1',
    lastName: 'DOE',
    firstName: 'JANE',
    middleInitial: null,
    suffixName: null,
    email: null,
    telephone: null,
    ...voter,
  },
});

const committee = (
  cityTown: string,
  legDistrict: number,
  electionDistrict: number,
  memberships: ReturnType<typeof member>[] = [],
): SignInSheetCommitteeInput => ({
  cityTown,
  legDistrict,
  electionDistrict,
  memberships,
});

describe('buildSignInSheets grouping', () => {
  it('should make one sheet for a town that spans several LDs', () => {
    const sheets = buildSignInSheets([
      committee('BRIGHTON', 16, 1, [member({ VRCNUM: 'A' })]),
      committee('BRIGHTON', 25, 2, [member({ VRCNUM: 'B' })]),
    ]);

    expect(sheets).toHaveLength(1);
    expect(sheets[0]?.committeeLabel).toBe('Brighton');
    expect(sheets[0]?.rows).toHaveLength(2);
  });

  it('should make one sheet per Rochester LD at its alphabetical position', () => {
    const sheets = buildSignInSheets([
      committee('BRIGHTON', 16, 1),
      committee('ROCHESTER', 21, 1),
      committee('ROCHESTER', 21, 2),
      committee('ROCHESTER', 26, 1),
      committee('WEBSTER', 4, 1),
    ]);

    expect(sheets.map((s) => s.committeeLabel)).toEqual([
      'Brighton',
      'Rochester LD 21',
      'Rochester LD 26',
      'Webster',
    ]);
  });

  it('should title-case each word of a town name', () => {
    const [sheet] = buildSignInSheets([committee('EAST ROCHESTER', 26, 1)]);

    expect(sheet?.committeeLabel).toBe('East Rochester');
  });

  it('should add the LD to a town narrowed to one LD', () => {
    const [sheet] = buildSignInSheets([committee('EAST ROCHESTER', 26, 1)], {
      cityTown: 'EAST ROCHESTER',
      legDistrict: 26,
    });

    expect(sheet?.committeeLabel).toBe('East Rochester LD 26');
  });

  it('should not repeat the LD for a narrowed Rochester job', () => {
    const [sheet] = buildSignInSheets([committee('ROCHESTER', 26, 1)], {
      cityTown: 'ROCHESTER',
      legDistrict: 26,
    });

    expect(sheet?.committeeLabel).toBe('Rochester LD 26');
  });

  it('should keep an empty committee as a sheet with no rows', () => {
    const sheets = buildSignInSheets([committee('BRIGHTON', 16, 1)]);

    expect(sheets).toEqual([{ committeeLabel: 'Brighton', rows: [] }]);
  });
});

describe('resolveSignInSheetTitleScope', () => {
  it('should keep the jurisdiction on a jurisdiction job', () => {
    expect(
      resolveSignInSheetTitleScope({
        scope: 'jurisdiction',
        cityTown: 'BRIGHTON',
        legDistrict: 16,
      }),
    ).toEqual({ cityTown: 'BRIGHTON', legDistrict: 16 });
  });

  it('should drop stray fields on a countywide job', () => {
    expect(
      resolveSignInSheetTitleScope({
        scope: 'countywide',
        cityTown: 'BRIGHTON',
        legDistrict: 16,
      }),
    ).toEqual({});
  });
});

describe('buildSignInSheets sorting', () => {
  const sortedNames = (
    ...committees: SignInSheetCommitteeInput[]
  ): string[] =>
    buildSignInSheets(committees)[0]?.rows.map((row) => row.name) ?? [];

  it('should sort by last name across EDs', () => {
    expect(
      sortedNames(
        committee('BRIGHTON', 16, 1, [member({ lastName: 'WILT' })]),
        committee('BRIGHTON', 16, 2, [member({ lastName: 'ADAMS' })]),
      ),
    ).toEqual(['ADAMS, JANE', 'WILT, JANE']);
  });

  it('should tie-break on first name, then middle initial', () => {
    expect(
      sortedNames(
        committee('BRIGHTON', 16, 1, [
          member({ firstName: 'ZOE' }),
          member({ firstName: 'AMY', middleInitial: 'B' }),
          member({ firstName: 'AMY', middleInitial: 'A' }),
        ]),
      ),
    ).toEqual(['DOE, AMY A', 'DOE, AMY B', 'DOE, ZOE']);
  });

  it('should tie-break on LD, then ED, then VRCNUM', () => {
    const sheets = buildSignInSheets([
      committee('BRIGHTON', 25, 1, [member({ email: 'ld25@example.invalid' })]),
      committee('BRIGHTON', 16, 2, [
        member({ VRCNUM: 'B', email: 'ed2-b@example.invalid' }),
        member({ VRCNUM: 'A', email: 'ed2-a@example.invalid' }),
      ]),
      committee('BRIGHTON', 16, 1, [member({ email: 'ed1@example.invalid' })]),
    ]);

    expect(sheets[0]?.rows.map((row) => row.email)).toEqual([
      'ed1@example.invalid',
      'ed2-a@example.invalid',
      'ed2-b@example.invalid',
      'ld25@example.invalid',
    ]);
  });

  it('should compare case-insensitively and treat null as blank', () => {
    expect(
      sortedNames(
        committee('BRIGHTON', 16, 1, [
          member({ lastName: 'Baker' }),
          member({ lastName: 'ADAMS' }),
          member({ lastName: null, firstName: 'CHER' }),
          member({ lastName: 'cole' }),
        ]),
      ),
    ).toEqual(['CHER', 'ADAMS, JANE', 'Baker, JANE', 'cole, JANE']);
  });
});

describe('buildSignInSheets member contact', () => {
  it('should prefer Leader-entered contact and format the phone', () => {
    const sheets = buildSignInSheets([
      committee('BRIGHTON', 16, 1, [
        member(
          { email: 'voter@example.invalid', telephone: '5855550100' },
          { email: 'leader@example.invalid', phone: '585-555-0199' },
        ),
      ]),
    ]);

    expect(sheets[0]?.rows[0]).toMatchObject({
      email: 'leader@example.invalid',
      phone: '(585) 555-0199',
    });
  });

  it('should treat whitespace-only contact as missing', () => {
    const sheets = buildSignInSheets([
      committee('BRIGHTON', 16, 1, [member({ email: '  ', telephone: ' ' })]),
    ]);

    expect(sheets[0]?.rows[0]).toMatchObject({ email: null, phone: null });
  });
});

describe('formatMemberName', () => {
  const name = (parts: Partial<Voter>) =>
    formatMemberName({
      lastName: null,
      firstName: null,
      middleInitial: null,
      suffixName: null,
      ...parts,
    });

  it('should format every part', () => {
    expect(
      name({
        lastName: 'DOE',
        firstName: 'JOHN',
        middleInitial: 'Q',
        suffixName: 'JR',
      }),
    ).toBe('DOE, JOHN Q JR');
  });

  it('should drop a missing middle initial', () => {
    expect(name({ lastName: 'DOE', firstName: 'JOHN' })).toBe('DOE, JOHN');
  });

  it('should drop the period after an initial', () => {
    expect(
      name({ lastName: 'DOE', firstName: 'JOHN', middleInitial: 'Q.' }),
    ).toBe('DOE, JOHN Q');
  });

  it('should drop the comma when either side is empty', () => {
    expect(name({ lastName: 'DOE' })).toBe('DOE');
    expect(name({ firstName: 'JOHN' })).toBe('JOHN');
    expect(name({ lastName: '  ', firstName: 'JOHN' })).toBe('JOHN');
  });
});

describe('formatPhone', () => {
  it.each([
    ['5855551234', '(585) 555-1234'],
    ['585-555-1234', '(585) 555-1234'],
    ['15855551234', '(585) 555-1234'],
    ['1 (585) 555-1234', '(585) 555-1234'],
    ['  555-1234 ', '555-1234'],
    ['25855551234', '25855551234'],
    ['', null],
    ['   ', null],
    [null, null],
  ])('should format %p as %p', (input, expected) => {
    expect(formatPhone(input)).toBe(expected);
  });
});

describe('paginateSignInSheetRows', () => {
  const rows = (count: number): SignInSheetRow[] =>
    Array.from({ length: count }, (_, i) => ({
      electionDistrict: i,
      name: `MEMBER${i}`,
      email: null,
      phone: null,
    }));

  it.each([
    [0, [0]],
    [7, [7]],
    [8, [7, 1]],
    [15, [7, 8]],
    [16, [7, 8, 1]],
    [151, [7, ...Array<number>(18).fill(8)]],
  ])('should split %i rows into pages of %p', (count, expected) => {
    expect(
      paginateSignInSheetRows(rows(count)).map((page) => page.length),
    ).toEqual(expected);
  });
});

describe('formatCalendarDate', () => {
  const originalTimeZone = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTimeZone;
  });

  it.each(['America/Los_Angeles', 'UTC', 'Pacific/Auckland'])(
    'should print the same day in %s',
    (timeZone) => {
      process.env.TZ = timeZone;

      expect(formatCalendarDate('2026-03-15')).toBe('March 15, 2026');
    },
  );

  it('should drop leading zeros from the day', () => {
    expect(formatCalendarDate('2026-11-07')).toBe('November 7, 2026');
  });

  it.each(['', 'not-a-date', '2026-13-01'])(
    'should return blank for %p',
    (value) => {
      expect(formatCalendarDate(value)).toBe('');
    },
  );
});

describe('formatMeetingLine', () => {
  it.each([
    ['Reorganization', '2026-03-15', 'Reorganization — March 15, 2026'],
    ['Reorganization', undefined, 'Reorganization'],
    [undefined, '2026-03-15', 'March 15, 2026'],
    [undefined, undefined, ''],
  ])('should combine %p and %p', (name, date, expected) => {
    expect(formatMeetingLine(name, date)).toBe(expected);
  });
});

describe('formatContactInfoDate', () => {
  const now = new Date('2026-11-07T17:00:00Z');

  it('should use the import date', () => {
    expect(formatContactInfoDate(new Date('2026-09-23T15:00:00Z'), now)).toBe(
      '9/23/2026',
    );
  });

  it('should keep a late-evening Eastern import on its own day', () => {
    expect(formatContactInfoDate(new Date('2026-09-24T03:30:00Z'), now)).toBe(
      '9/23/2026',
    );
  });

  it('should fall back to the generation date in Eastern time', () => {
    expect(formatContactInfoDate(null, now)).toBe('11/7/2026');
    expect(formatContactInfoDate(null, new Date('2026-11-08T03:30:00Z'))).toBe(
      '11/7/2026',
    );
  });
});
