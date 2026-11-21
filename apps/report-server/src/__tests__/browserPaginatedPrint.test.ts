jest.mock('../s3Utils', () => ({ uploadFileToR2: jest.fn() }));
jest.mock('puppeteer', () => ({ launch: jest.fn() }));

import puppeteer from 'puppeteer';
import { uploadFileToR2 } from '../s3Utils';
import {
  BROWSER_PAGINATED_PRINT_CSS,
  generateChangesReportHTML,
  generateCommitteeReportHTML,
  generateDesignationWeightSummaryHTML,
  generateHTML,
  generatePDFAndUpload,
  generateSignInSheetHTML,
  generatePetitionOutcomesReportHTML,
  generateVacancyReportHTML,
} from '../utils';
import type {
  ChangesReportRow,
  PetitionOutcomeRow,
  VacancyReportRow,
} from '../committeeMappingHelpers';

const vacancyRow: VacancyReportRow = {
  cityTown: 'BRIGHTON',
  legDistrict: 16,
  electionDistrict: 1,
  totalSeats: 4,
  filledSeats: 2,
  vacantSeats: 2,
  petitionedSeats: 3,
  vacantPetitionedSeats: 1,
  nonPetitionedSeats: 1,
};

const changesRow: ChangesReportRow = {
  memberName: 'Test Member',
  cityTown: 'BRIGHTON',
  legDistrict: 16,
  electionDistrict: 1,
  changeType: 'Added',
  changeDate: '2026-02-02',
  details: '',
};

const outcomeRow: PetitionOutcomeRow = {
  committeeListId: 1,
  cityTown: 'BRIGHTON',
  legDistrict: 16,
  electionDistrict: 1,
  seatNumber: 1,
  candidateName: 'Test Candidate',
  voteCount: 10,
  outcome: 'Won',
  primaryDate: '2026-06-23',
};

/**
 * generatePDFAndUpload only calls newPage/close on the browser and three methods on the page.
 * The cast is the Puppeteer boundary: a full Browser/Page fake would be hundreds of members.
 */
function fakeBrowser(createPDFStream: jest.Mock): Awaited<ReturnType<typeof puppeteer.launch>> {
  const page = { setDefaultTimeout: jest.fn(), setContent: jest.fn(), createPDFStream };
  return { newPage: async () => page, close: jest.fn() } as unknown as Awaited<ReturnType<typeof puppeteer.launch>>;
}

describe('print rules for browser-paginated reports', () => {
  const browserPaginated = {
    vacancy: generateVacancyReportHTML([vacancyRow], 'Tester'),
    changes: generateChangesReportHTML([changesRow], '2026-02-01', '2026-02-28', 'Tester'),
    outcomes: generatePetitionOutcomesReportHTML([outcomeRow], 'Tester'),
  };

  it('the print rules give page margins, unsplittable rows and a repeating header', () => {
    expect(BROWSER_PAGINATED_PRINT_CSS).toMatch(/@page\s*\{\s*margin:/);
    expect(BROWSER_PAGINATED_PRINT_CSS).toMatch(/tr\s*\{\s*break-inside:\s*avoid;/);
    expect(BROWSER_PAGINATED_PRINT_CSS).toMatch(/thead\s*\{\s*display:\s*table-header-group;/);
  });

  // Each report puts the rules in its own <head>, ahead of its own document body.
  it.each([
    ['vacancy', browserPaginated.vacancy, '<title>Vacancy Report</title>', '>Vacancy Report</h1>'],
    ['changes', browserPaginated.changes, '<title>Committee Changes</title>', '>Committee Changes</h1>'],
    ['outcomes', browserPaginated.outcomes, '<title>Petition Outcomes Report</title>', '>Petition Outcomes Report</h1>'],
  ])('%s report carries the print rules in its head', (_name, html, title, heading) => {
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toContain(title);
    expect(head).toContain(BROWSER_PAGINATED_PRINT_CSS);
    expect(html.indexOf(heading)).toBeGreaterThan(html.indexOf('</head>'));
    expect(html.split(BROWSER_PAGINATED_PRINT_CSS)).toHaveLength(2);
  });

  it('the shared PDF options set no margins, so code-paginated reports are unchanged', async () => {
    const createPDFStream = jest.fn().mockResolvedValue({});
    jest.mocked(puppeteer.launch).mockResolvedValue(fakeBrowser(createPDFStream));
    jest.mocked(uploadFileToR2).mockResolvedValue(true);
    await generatePDFAndUpload('<html></html>', true, 'x.pdf');
    expect(createPDFStream.mock.calls[0][0]).not.toHaveProperty('margin');
  });

  // These paginate in code with fixed page heights; page margins or break rules would move them.
  it.each([
    ['weight summary', () => generateDesignationWeightSummaryHTML([], 'Countywide', 'Tester')],
    ['committee roster', () => generateCommitteeReportHTML([])],
    ['sign-in sheet', () => generateSignInSheetHTML([], { contactInfoDate: 'March 1, 2026' })],
    [
      'designating petition',
      () => generateHTML([{ name: 'Test Candidate', address: '1 Test St', office: 'Member' }], [], 'DEM', '2026-06-23', 1),
    ],
  ])('%s does not get the browser-paginated print rules', (_name, generate) => {
    const html = generate();
    expect(html).toContain('</head>');
    expect(html).not.toContain(BROWSER_PAGINATED_PRINT_CSS);
    expect(html).not.toContain('@page');
    expect(html).not.toContain('print-keep-');
  });

  it('vacancy keeps group headings with their rows and subtotals with their group', () => {
    const html = browserPaginated.vacancy;
    expect(html).toMatch(/<tr class="[^"]*print-keep-with-next[^"]*"><td colSpan="7"[^>]*>BRIGHTON, LD 16</);
    expect(html).toMatch(/<tr class="[^"]*print-keep-with-previous[^"]*"><td[^>]*>Subtotal/);
    expect(html).toMatch(/<tr class="[^"]*print-keep-with-previous[^"]*"><td[^>]*>Grand Total/);
    expect(html).not.toContain('h-[8.5in]');
  });

  it('petition outcomes keeps each ED heading with its table and fixes column widths', () => {
    const html = browserPaginated.outcomes;
    expect(html).toMatch(/<div class="[^"]*print-keep-together[^"]*"><h2 class="[^"]*print-keep-with-next/);
    expect(html).toContain('table-fixed');
    expect((html.match(/<col class="w-\[\d+%\]"\/>/g) ?? []).length).toBe(5);
    expect(html).not.toContain('min-h-[8.5in]');
  });
});
