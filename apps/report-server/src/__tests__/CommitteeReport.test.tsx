import React from 'react';
import ReactDOMServer from 'react-dom/server';
import CommitteeReport from '../components/CommitteeReport';
import type { CommitteeMember } from '../components/CommitteeReport';

const longEmail = `${'a'.repeat(80)}@example.com`;

function member(overrides: Partial<CommitteeMember> = {}): CommitteeMember {
  return {
    name: 'Jane Doe',
    address: '123 Main St, Rochester, NY 14604',
    city: 'Rochester',
    state: 'NY',
    zip: '14604',
    phone: '585-555-0100',
    mailingAddress: 'PO Box 9, Rochester, NY 14603',
    email: longEmail,
    ...overrides,
  };
}

const groupedCommittees = [
  {
    cityTown: 'ROCHESTER',
    legDistrict: 1,
    committees: { '7': [member()] },
  },
];

/** Text of each header cell, in order. */
function headerCells(html: string): string[] {
  const thead = html.match(/<thead>(.*?)<\/thead>/)?.[1] ?? '';
  return [...thead.matchAll(/<th[^>]*>(.*?)<\/th>/g)].map((m) => m[1]!);
}

/** Opening tag of each body cell, so tests can check its classes. */
function bodyCells(html: string): string[] {
  const tbody = html.match(/<tbody>(.*?)<\/tbody>/)?.[1] ?? '';
  return [...tbody.matchAll(/<td[^>]*>/g)].map((m) => m[0]);
}

describe('CommitteeReport', () => {
  // The footer prints today's date; freeze it so snapshots match in any time zone.
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders the legacy columns when columns is omitted', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(CommitteeReport, { groupedCommittees }),
    );

    expect(headerCells(html)).toEqual([
      'Serve ED',
      'Name',
      'Address',
      'City',
      'State',
      'Zip',
      'Phone',
    ]);
    expect(html).not.toContain('table-fixed');
    expect(html).not.toContain('truncate');
    expect(html).not.toContain(longEmail);
  });

  it('renders Serve ED and only the selected columns, in fixed order', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(CommitteeReport, {
        groupedCommittees,
        columns: ['telephone', 'name', 'address'],
      }),
    );

    expect(headerCells(html)).toEqual(['Serve ED', 'Name', 'Address', 'Phone']);
    expect(html).toContain('007');
    expect(html).toContain('585-555-0100');
    expect(html).not.toContain('PO Box 9');
    expect(html).not.toContain(longEmail);
  });

  it('renders every column with a fixed layout and single-line truncated cells', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(CommitteeReport, {
        groupedCommittees,
        columns: ['name', 'address', 'mailingAddress', 'telephone', 'email'],
      }),
    );

    expect(headerCells(html)).toEqual([
      'Serve ED',
      'Name',
      'Address',
      'Mailing Address',
      'Phone',
      'Email',
    ]);
    expect(html).toMatch(/<table class="[^"]*\btable-fixed\b/);
    const cells = bodyCells(html);
    expect(cells).toHaveLength(6);
    cells.forEach((cell) => expect(cell).toMatch(/\btruncate\b/));
    expect(html).toContain('PO Box 9, Rochester, NY 14603');
    expect(html).toContain(longEmail);
  });

  it('renders empty cells for a member with no mailing address, phone, or email', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(CommitteeReport, {
        groupedCommittees: [
          {
            cityTown: 'BRIGHTON',
            legDistrict: 1,
            committees: {
              '3': [
                member({ phone: '', mailingAddress: undefined, email: undefined }),
              ],
            },
          },
        ],
        columns: ['name', 'address', 'mailingAddress', 'telephone', 'email'],
      }),
    );

    expect(html).not.toMatch(/undefined|null/);
    expect(html).toContain('<td class="pl-2 truncate"></td>');
  });

  it('should match the legacy layout snapshot when columns is omitted', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(CommitteeReport, { groupedCommittees }),
    );

    expect(html).toMatchSnapshot();
  });

  it('should match the roster layout snapshot when every column is selected', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(CommitteeReport, {
        groupedCommittees,
        columns: ['name', 'address', 'mailingAddress', 'telephone', 'email'],
      }),
    );

    expect(html).toMatchSnapshot();
  });
});
