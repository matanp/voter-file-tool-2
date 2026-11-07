import React from 'react';
import ReactDOMServer from 'react-dom/server';
import SignInSheet from '../components/SignInSheet';
import {
  buildSignInSheets,
  resolveSignInSheetTitleScope,
  type SignInSheetData,
  type SignInSheetRow,
} from '../signInSheetHelpers';

const row = (overrides: Partial<SignInSheetRow> = {}): SignInSheetRow => ({
  electionDistrict: 1,
  name: 'DOE, JANE',
  email: 'jane@example.invalid',
  phone: '(585) 555-0100',
  ...overrides,
});

const rows = (count: number): SignInSheetRow[] =>
  Array.from({ length: count }, (_, i) =>
    row({ name: `MEMBER${String(i + 1).padStart(4, '0')}, TEST` }),
  );

const render = (
  sheets: SignInSheetData[],
  options: { meetingName?: string; meetingDate?: string } = {},
): string =>
  ReactDOMServer.renderToStaticMarkup(
    <SignInSheet sheets={sheets} contactInfoDate="9/23/2026" {...options} />,
  );

const count = (html: string, text: string): number =>
  html.split(text).length - 1;

const titleOf = (html: string): string =>
  /data-sign-in-title="true"[^>]*>(.*?)<\/div>/.exec(html)?.[1] ?? '';

const pageNumbers = (html: string): string[] =>
  [...html.matchAll(/data-sign-in-page-number="true"[^>]*>(.*?)<\/span>/g)].map(
    (match) => (match[1] ?? '').replace(/<!-- -->/g, ''),
  );

describe('SignInSheet rows', () => {
  it('should render the columns and member contact', () => {
    const html = render([
      { committeeLabel: 'Brighton', rows: [row({ electionDistrict: 21 })] },
    ]);

    for (const label of [
      'ED',
      'Member name',
      'Email on file',
      'Phone on file',
      'Member signature',
      'Proxy name (print)',
      'Proxy signature',
    ]) {
      expect(html).toContain(`>${label}</th>`);
    }
    expect(html).toContain('>21</td>');
    expect(html).toContain('DOE, JANE');
    expect(html).toContain('[ ] Info correct');
    expect(html).toContain('jane@example.invalid');
    expect(html).toContain('New email:');
    expect(html).toContain('(585) 555-0100');
    expect(html).toContain('New phone:');
  });

  it('should print None on file for missing email and phone', () => {
    const html = render([
      {
        committeeLabel: 'Brighton',
        rows: [row({ email: null, phone: null })],
      },
    ]);

    expect(count(html, 'None on file')).toBe(2);
  });

  it('should print an alphabetical sheet across EDs with an unpadded ED', () => {
    const voter = {
      VRCNUM: 'V',
      firstName: 'TEST',
      middleInitial: null,
      suffixName: 'JR',
      email: null,
      telephone: null,
    };
    const html = render(
      buildSignInSheets([
        {
          cityTown: 'BRIGHTON',
          legDistrict: 16,
          electionDistrict: 2,
          memberships: [
            {
              submissionMetadata: null,
              voterRecord: { ...voter, lastName: 'ZIMMER' },
            },
          ],
        },
        {
          cityTown: 'BRIGHTON',
          legDistrict: 16,
          electionDistrict: 21,
          memberships: [
            {
              submissionMetadata: null,
              voterRecord: { ...voter, lastName: 'ADAMS' },
            },
          ],
        },
      ]),
    );

    expect(html.indexOf('ADAMS, TEST JR')).toBeLessThan(
      html.indexOf('ZIMMER, TEST JR'),
    );
    expect(html).toContain('>21</td>');
    expect(html).not.toContain('021');
  });

  it('should print one row per member and no blank rows', () => {
    const html = render([{ committeeLabel: 'Brighton', rows: rows(3) }]);

    expect(count(html, 'data-sign-in-row')).toBe(3);
  });
});

describe('SignInSheet pagination', () => {
  it('should split 17 members 7/8/2 with the title on the first page', () => {
    const html = render([{ committeeLabel: 'Brighton', rows: rows(17) }]);

    expect(count(html, 'data-sign-in-page="true"')).toBe(3);
    expect(count(html, 'data-sign-in-header')).toBe(3);
    expect(count(html, 'data-sign-in-title')).toBe(1);
    expect(count(html, 'data-sign-in-row')).toBe(17);
    expect(
      html
        .split('data-sign-in-page="true"')
        .slice(1)
        .map((page) => count(page, 'data-sign-in-row')),
    ).toEqual([7, 8, 2]);
    expect(pageNumbers(html)).toEqual(['Page 1', 'Page 2', 'Page 3']);
  });

  it('should restart page numbers on each sheet', () => {
    const html = render([
      { committeeLabel: 'Brighton', rows: rows(8) },
      { committeeLabel: 'Rochester LD 26', rows: rows(1) },
    ]);

    expect(pageNumbers(html)).toEqual(['Page 1', 'Page 2', 'Page 1']);
    expect(count(html, 'data-sign-in-title')).toBe(2);
  });

  it('should not print a page total or a report author', () => {
    const html = render([{ committeeLabel: 'Brighton', rows: rows(9) }]);

    expect(html).not.toMatch(/Page\s*(<!-- -->)?\d+(<!-- -->)?\s*of/);
    expect(html).not.toContain('Author');
  });
});

describe('SignInSheet title', () => {
  const sheet = [{ committeeLabel: 'Brighton', rows: rows(1) }];

  it.each([
    [
      'name and date',
      { meetingName: 'Reorganization', meetingDate: '2026-03-15' },
      'Reorganization — March 15, 2026',
    ],
    ['name only', { meetingName: 'Reorganization' }, 'Reorganization'],
    ['date only', { meetingDate: '2026-03-15' }, 'March 15, 2026'],
  ])('should print the meeting line with %s', (_, options, expected) => {
    expect(titleOf(render(sheet, options))).toContain(`>${expected}</p>`);
  });

  it('should print no meeting line with neither', () => {
    const title = titleOf(render(sheet));

    expect(title).toContain('Brighton');
    expect(title).not.toContain('<p');
  });

  it('should title a town narrowed to one LD', () => {
    const committees = [
      { cityTown: 'EAST ROCHESTER', legDistrict: 26, electionDistrict: 1 },
    ];
    const titleScope = resolveSignInSheetTitleScope({
      scope: 'jurisdiction',
      cityTown: 'EAST ROCHESTER',
      legDistrict: 26,
    });

    const html = render(buildSignInSheets(committees, titleScope));

    expect(titleOf(html).replace(/<!-- -->/g, '')).toContain(
      'East Rochester LD 26 Committee',
    );
  });

  it('should ignore a stray legDistrict on a countywide job', () => {
    const committees = [
      { cityTown: 'BRIGHTON', legDistrict: 16, electionDistrict: 1 },
    ];
    const titleScope = resolveSignInSheetTitleScope({
      scope: 'countywide',
      cityTown: 'BRIGHTON',
      legDistrict: 16,
    });

    const html = render(buildSignInSheets(committees, titleScope));

    expect(titleOf(html).replace(/<!-- -->/g, '')).toContain(
      'Brighton Committee',
    );
    expect(html).not.toContain('LD 16');
  });
});

describe('SignInSheet footer', () => {
  const footerOf = (html: string): string =>
    (
      /data-sign-in-footer-text="true"[^>]*>(.*?)<\/span>/.exec(html)?.[1] ?? ''
    ).replace(/<!-- -->/g, '');

  it('should name the meeting, member count and contact date', () => {
    const html = render([{ committeeLabel: 'Brighton', rows: rows(3) }], {
      meetingName: '2026 Reorganization',
    });

    expect(footerOf(html)).toBe(
      'Brighton Democratic Committee | 2026 Reorganization Sign-In Sheet | 3 eligible members | Contact info as of 9/23/2026',
    );
  });

  it('should fall back to Sign-In Sheet with no meeting name', () => {
    const html = render([{ committeeLabel: 'Brighton', rows: rows(3) }]);

    expect(footerOf(html)).toContain('Committee | Sign-In Sheet | 3 eligible');
  });

  it('should print a header-only sheet for a committee with no members', () => {
    const html = render([{ committeeLabel: 'Brighton', rows: [] }]);

    expect(count(html, 'data-sign-in-page="true"')).toBe(1);
    expect(count(html, 'data-sign-in-header')).toBe(1);
    expect(count(html, 'data-sign-in-row')).toBe(0);
    expect(footerOf(html)).toContain('0 eligible members');
    expect(pageNumbers(html)).toEqual(['Page 1']);
  });
});
