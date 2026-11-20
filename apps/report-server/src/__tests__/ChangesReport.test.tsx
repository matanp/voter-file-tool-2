import React from 'react';
import ReactDOMServer from 'react-dom/server';
import ChangesReport from '../components/ChangesReport';
import type { ChangesReportRow } from '../committeeMappingHelpers';

const row: ChangesReportRow = {
  memberName: 'Jane Doe',
  cityTown: 'ROCHESTER',
  legDistrict: 17,
  electionDistrict: 3,
  changeType: 'Added',
  changeDate: '2026-03-05',
  details: '',
};

describe('ChangesReport dates', () => {
  it('environment check: jest runs west of UTC, where a UTC-midnight date reads a day early', () => {
    expect(new Date('2026-03-05').getDate()).toBe(4);
  });

  it('shows the range and row dates on their own calendar day', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <ChangesReport rows={[row]} dateFrom="2026-03-01" dateTo="2026-03-31" reportAuthor="Tester" />,
    );
    expect(html).toContain('Mar 1, 2026');
    expect(html).toContain('Mar 31, 2026');
    expect(html).toContain('Mar 5, 2026');
    expect(html).not.toContain('Feb 28, 2026');
    expect(html).not.toContain('Mar 4, 2026');
  });
});

describe('ChangesReport page geometry', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    <ChangesReport rows={[row]} dateFrom="2026-03-01" dateTo="2026-03-31" reportAuthor="Tester" />,
  );
  const containerClasses = (/^<div class="([^"]*)"/.exec(html)?.[1] ?? '').split(' ');

  it('fills the printable width and sets no fixed or minimum height', () => {
    expect(containerClasses).toContain('w-full');
    expect(containerClasses.filter((c) => /^(min-)?[wh]-\[/.test(c) || /^(min-)?h-/.test(c))).toEqual([]);
  });

  it('keeps the Date header and cells on one line', () => {
    expect(html).toMatch(/<th class="[^"]*whitespace-nowrap[^"]*">Date<\/th>/);
    expect(html).toMatch(/<td class="[^"]*whitespace-nowrap[^"]*">Mar 5, 2026<\/td>/);
  });

  it('lets long unbroken names and details wrap instead of widening the table', () => {
    expect(html).toMatch(/<td class="[^"]*\[overflow-wrap:anywhere\][^"]*">Jane Doe<\/td>/);
  });
});
