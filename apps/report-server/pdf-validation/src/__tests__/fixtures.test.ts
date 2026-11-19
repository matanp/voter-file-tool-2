import { ALL_FIXTURES, fixtureById, fixturesFor, jobTypesCovered } from '../fixtures';
import { PDF_JOB_TYPES } from '../fixtures/types';

const pagesOf = (id: string) => fixtureById(id).expect.pages;

describe('fixture manifest v1', () => {
  it('covers every PDF job type in quick mode, one fixture each', () => {
    const quick = fixturesFor('quick');
    expect([...jobTypesCovered(quick)].sort()).toEqual([...PDF_JOB_TYPES].sort());
    expect(quick).toHaveLength(PDF_JOB_TYPES.length);
  });

  it('runs quick coverage plus every boundary and stress fixture in full mode', () => {
    const full = fixturesFor('full');
    expect(full).toHaveLength(ALL_FIXTURES.length);
    for (const q of fixturesFor('quick')) expect(full).toContain(q);
  });

  it('has unique ids and hashes', () => {
    expect(new Set(ALL_FIXTURES.map((f) => f.id)).size).toBe(ALL_FIXTURES.length);
    expect(new Set(ALL_FIXTURES.map((f) => f.hash)).size).toBe(ALL_FIXTURES.length);
  });

  it.each([
    ['roster-quick', 1],
    ['legacy-quick', 1],
    ['roster-ed29', 1],
    ['roster-ed45-split', 2],
    ['roster-large-800x4', 134],
    ['legacy-large-800x4', 134],
    ['signin-quick', 1],
    ['signin-0', 1],
    ['signin-8-missing-contacts', 2],
    ['signin-17', 3],
    ['signin-151', 19],
    ['signin-multi-jurisdiction', 4],
    ['weights-quick', 1],
    ['weights-20', 1],
    ['weights-21', 2],
    ['weights-200', 10],
    ['petition-quick', 1],
    ['petition-10-long', 10],
  ])('expects %s to have %i page(s), as the ticket specifies', (id, pages) => {
    expect(pagesOf(id)).toBe(pages);
  });

  it('splits the 45-member ED 29 + 16', () => {
    expect(fixtureById('roster-ed45-split').expect.pageTokens!.map((p) => p.length)).toEqual([29, 16]);
  });

  it('puts 7 rows on the first sign-in page and 8 after', () => {
    expect(fixtureById('signin-17').expect.pageTokens!.map((p) => p.length)).toEqual([7, 8, 2]);
  });

  it('leaves browser-paginated reports to an approved full-Chrome count', () => {
    for (const id of ['vacancy-quick', 'vacancy-200', 'changes-200', 'outcomes-200', 'outcomes-empty']) {
      expect(pagesOf(id)).toBe('browser-paginated');
    }
  });

  it('computes weight-summary totals independently', () => {
    const required = fixtureById('weights-quick').expect.requiredOnPage!.map((r) => r.text);
    // 7000.25 + 7001.25 + 7002.25 + 7003.25
    expect(required).toContain('Subtotal 28007.00');
    expect(required).toContain('Grand Total: 28007.00');
  });

  it("expects each weight row's LTED, Base and Designation Weight cells", () => {
    const required = fixtureById('weights-quick').expect.requiredOnPage!.map((r) => r.text);
    // Row 0 has no LTED weight; row 1 has 0.25 per seat on 2 petitioned seats.
    expect(required).toContain('— — 7000.25');
    expect(required).toContain('0.25 0.50 7001.25');
    expect(required).toContain('Committees with missing weights: BRIGHTON LD16 ED001');
  });

  it('computes vacancy totals independently', () => {
    // Rows k=0..3: filled 0,1,2,3 of 4; petitioned 2,3,4,2.
    expect(fixtureById('vacancy-quick').expect.required).toContain('Grand Total 16 6 10 5 6 5');
  });

  it('never reuses a token within a fixture unless it repeats per sheet', () => {
    for (const f of ALL_FIXTURES) {
      const expected = f.input.jobType === 'designatedPetition' ? (f.input.numPages) : 1;
      for (const [token, count] of Object.entries(f.expect.tokenCounts)) {
        if (token === 'None on file') continue;
        expect([f.id, token, count]).toEqual([f.id, token, expected]);
      }
    }
  });
});
