jest.mock('../s3Utils', () => ({ uploadFileToR2: jest.fn() }));
jest.mock('puppeteer', () => ({ launch: jest.fn() }));

import {
  BROWSER_PAGINATED_PRINT_CSS,
  generateChangesReportHTML,
  generateDesignationWeightSummaryHTML,
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

describe('print rules for browser-paginated reports', () => {
  const browserPaginated = {
    vacancy: generateVacancyReportHTML([vacancyRow], 'Tester'),
    changes: generateChangesReportHTML([changesRow], '2026-02-01', '2026-02-28', 'Tester'),
    outcomes: generatePetitionOutcomesReportHTML([outcomeRow], 'Tester'),
  };

  it.each(Object.entries(browserPaginated))(
    '%s report carries page margins and row/heading break rules',
    (_name, html) => {
      expect(html).toContain(BROWSER_PAGINATED_PRINT_CSS);
      expect(BROWSER_PAGINATED_PRINT_CSS).toMatch(/@page\s*\{\s*margin:/);
      expect(BROWSER_PAGINATED_PRINT_CSS).toMatch(/tr\s*\{\s*break-inside:\s*avoid;/);
      expect(BROWSER_PAGINATED_PRINT_CSS).toMatch(/thead\s*\{\s*display:\s*table-header-group;/);
    },
  );

  it('fixed-height reports do not get the page margins', () => {
    const html = generateDesignationWeightSummaryHTML([], 'Countywide', 'Tester');
    expect(html).not.toContain('@page');
  });

  it('vacancy keeps group headings with their rows and subtotals with their group', () => {
    const html = browserPaginated.vacancy;
    expect(html).toMatch(/<tr class="[^"]*print-keep-with-next[^"]*"><td colSpan="7"[^>]*>BRIGHTON, LD 16</);
    expect(html).toMatch(/<tr class="[^"]*print-keep-with-previous[^"]*"><td[^>]*>Subtotal/);
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
