import { COMMITTEE_ROSTER_COLUMN_ORDER } from '../committeeRosterConfig';
import {
  COMMITTEE_REPORT_MAX_PAGES,
  COMMITTEE_REPORT_PAGES_PER_PDF,
  generateCommitteeReportHTML,
  generateCommitteeReportHTMLChunks,
} from '../utils';
import { syntheticCommittees } from './helpers/syntheticCommittees';

/** The markup of each printed page, in order (each page ends with its page-break div). */
function pages(html: string): string[] {
  const body = html.slice(html.indexOf('<body>'), html.indexOf('</body>'));
  // Drop the report's wrapper <div>, so the first page compares like the others.
  return body.slice(body.indexOf('<div>') + '<div>'.length).split('<div class="page-break"></div></div>').slice(0, -1);
}

describe('generateCommitteeReportHTMLChunks', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  const fivePages = syntheticCommittees(5, 2, 2);

  it.each([
    ['legacy', undefined],
    ['roster', [...COMMITTEE_ROSTER_COLUMN_ORDER]],
  ])('%s: the slices hold exactly the whole report’s pages, in order', (_mode, columns) => {
    const whole = generateCommitteeReportHTML(fivePages, columns);
    const slices = generateCommitteeReportHTMLChunks(fivePages, columns, 2);

    expect(pages(whole)).toHaveLength(5);
    expect(slices.map((s) => pages(s).length)).toEqual([2, 2, 1]);
    expect(slices.flatMap(pages)).toEqual(pages(whole));
  });

  it('numbers every page against the whole report', () => {
    const slices = generateCommitteeReportHTMLChunks(fivePages, undefined, 2);
    const numbers = slices.map((s) => [...s.matchAll(/Page (\d+) of (\d+)/g)].map((m) => `${m[1]}/${m[2]}`));
    expect(numbers).toEqual([['1/5', '2/5'], ['3/5', '4/5'], ['5/5']]);
  });

  it('gives each slice its own complete document with the stylesheet', () => {
    for (const slice of generateCommitteeReportHTMLChunks(fivePages, undefined, 2)) {
      expect(slice).toMatch(/^<!DOCTYPE html>/);
      expect(slice).toContain('<title>Committee Report</title>');
      expect(slice).toContain('/tailwind.css" rel="stylesheet">');
      expect(slice.trimEnd()).toMatch(/<\/html>$/);
    }
  });

  it('returns a report that fits in one slice as the single-document HTML, unchanged', () => {
    const report = syntheticCommittees(COMMITTEE_REPORT_PAGES_PER_PDF, 1, 1);
    expect(generateCommitteeReportHTMLChunks(report)).toEqual([generateCommitteeReportHTML(report)]);
    expect(generateCommitteeReportHTMLChunks([])).toEqual([generateCommitteeReportHTML([])]);
  });

  it('refuses a report over the page limit, and prints one at the limit', () => {
    expect(generateCommitteeReportHTMLChunks(syntheticCommittees(COMMITTEE_REPORT_MAX_PAGES, 1, 1))).toHaveLength(
      Math.ceil(COMMITTEE_REPORT_MAX_PAGES / COMMITTEE_REPORT_PAGES_PER_PDF),
    );
    expect(() => generateCommitteeReportHTMLChunks(syntheticCommittees(COMMITTEE_REPORT_MAX_PAGES + 1, 1, 1))).toThrow(
      `This committee report would be ${COMMITTEE_REPORT_MAX_PAGES + 1} pages, over the ${COMMITTEE_REPORT_MAX_PAGES}-page limit`,
    );
  });

  it('splits at the production slice size by default', () => {
    const report = syntheticCommittees(COMMITTEE_REPORT_PAGES_PER_PDF + 1, 1, 1);
    expect(generateCommitteeReportHTMLChunks(report).map((s) => pages(s).length)).toEqual([
      COMMITTEE_REPORT_PAGES_PER_PDF,
      1,
    ]);
  });
});
