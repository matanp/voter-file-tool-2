import { generateHTML } from '../utils';
import {
  PETITION_FIT_SCRIPT,
  PETITION_MIN_SHEET_ZOOM,
  PETITION_MIN_VARIABLE_PX,
  petitionOverflowWarnings,
  readPetitionOverflowSheets,
} from '../petitionFit';

const SHEET_HEIGHT = 1344; // 14in at 96px/in
const LIMIT = SHEET_HEIGHT - 24; // "Sheet No." must end 0.25in above the edge

type FakeCell = {
  tagName: 'TD' | 'DIV';
  base: number;
  style: Record<string, string>;
};

/** What the fake layout sees of the current styles. */
type FitState = {
  fontSizes: number[];
  lineHeight: string | undefined;
  squeezed: boolean;
  zoom: number;
};

const fakeElement = () => {
  const attributes = new Set<string>();
  return {
    attributes,
    setAttribute: (name: string) => attributes.add(name),
    hasAttribute: (name: string) => attributes.has(name),
  };
};

/**
 * Fake sheets: candidate cells (TD) of `cellSizes` plus a vacancies box (DIV, 11px).
 * "Sheet No." ends at `contentHeight(state)` scaled by the content zoom. Enough to
 * exercise the script's levels without a browser.
 */
function runFit(
  cellSizes: number[],
  contentHeight: (state: FitState) => number,
  sheetCount = 1,
) {
  const sheets = Array.from({ length: sheetCount }, () => {
    const cells: FakeCell[] = [
      ...cellSizes.map((base) => ({ tagName: 'TD' as const, base, style: {} })),
      { tagName: 'DIV' as const, base: 11, style: {} },
    ];
    const content = { style: { zoom: '' } };
    const element = fakeElement();
    let measurements = 0;
    const zoom = () =>
      content.style.zoom ? parseFloat(content.style.zoom) : 1;
    const state = (): FitState => ({
      fontSizes: cells.map((c) =>
        c.style.fontSize ? parseFloat(c.style.fontSize) : c.base,
      ),
      lineHeight: cells[0]?.style.lineHeight,
      squeezed: cells.some((c) => c.style.minHeight === '0px'),
      zoom: zoom(),
    });
    const sheetNoBottom = () => contentHeight(state()) * zoom();
    const sheet = {
      ...element,
      style: {} as Record<string, string>,
      getBoundingClientRect: () => ({ bottom: SHEET_HEIGHT }),
      querySelector: (sel: string) =>
        sel === '[data-petition-sheet-no]'
          ? {
              getBoundingClientRect: () => {
                measurements++;
                return { bottom: sheetNoBottom() };
              },
            }
          : sel === '[data-petition-content]'
            ? content
            : null,
      querySelectorAll: () => cells,
    };
    return {
      sheet,
      cells,
      zoom,
      state,
      sheetNoBottom,
      measurements: () => measurements,
    };
  });
  const body = fakeElement();
  const document = {
    querySelectorAll: () => sheets.map((s) => s.sheet),
    body,
  };
  const getComputedStyle = (el: FakeCell) => ({ fontSize: `${el.base}px` });
  new Function('document', 'getComputedStyle', PETITION_FIT_SCRIPT)(
    document,
    getComputedStyle,
  );
  const first = sheets[0]!;
  return {
    cells: first.cells,
    zoom: first.zoom(),
    sheetNoBottom: first.sheetNoBottom(),
    sheets,
    bodyMarked: body.attributes.has('data-petition-overflow'),
  };
}

/** The printed (zoomed) size of each variable block's font. */
const printedSizes = (r: ReturnType<typeof runFit>) =>
  r.cells.map(
    (c) => (c.style.fontSize ? parseFloat(c.style.fontSize) : c.base) * r.zoom,
  );

describe('petition fit script', () => {
  it('leaves a sheet that already fits untouched', () => {
    const r = runFit([12, 12, 9], () => 1284);
    expect(r.cells.every((c) => Object.keys(c.style).length === 0)).toBe(true);
    expect(r.sheets[0]!.sheet.style).toEqual({});
    expect(r.zoom).toBe(1);
    expect(r.bodyMarked).toBe(false);
  });

  it('stops after tightening when that is enough', () => {
    const r = runFit([12, 12, 9], (s) =>
      s.lineHeight === '1.2' ? 1300 : 1366,
    );
    expect(r.cells[0]!.style).toMatchObject({
      lineHeight: '1.2',
      paddingTop: '2px',
      paddingBottom: '2px',
      height: 'auto',
    });
    // The vacancies box keeps its minimum height until the last level.
    expect(r.cells[3]!.style.minHeight).toBe('');
    expect(r.cells.every((c) => !c.style.fontSize)).toBe(true);
    expect(r.zoom).toBe(1);
  });

  it('shrinks fonts to the first size that fits and never grows a smaller cell', () => {
    const r = runFit([12, 12, 9], (s) => 1200 + s.fontSizes[0]! * 12);
    expect(r.cells.map((c) => c.style.fontSize)).toEqual([
      '10px',
      '10px',
      '',
      '10px',
    ]);
    expect(r.zoom).toBe(1);
  });

  it('zooms only after the variable font reaches the floor, keeping it at the floor in print', () => {
    // Fits once the sheet is zoomed to 94%.
    const r = runFit([12, 9], (s) => (s.zoom <= 0.94 ? 1400 : 1500));
    expect(r.zoom).toBeCloseTo(0.94);
    for (const size of printedSizes(r)) {
      expect(size).toBeGreaterThanOrEqual(PETITION_MIN_VARIABLE_PX - 1e-9);
    }
    expect(r.sheetNoBottom).toBeLessThanOrEqual(LIMIT);
    expect(r.bodyMarked).toBe(false);
  });

  it('squeezes only the variable blocks once the sheet is at the zoom cap', () => {
    const r = runFit([12, 9], (s) => (s.squeezed ? 1400 : 1600));
    expect(r.zoom).toBeCloseTo(PETITION_MIN_SHEET_ZOOM);
    expect(r.cells[0]!.style).toMatchObject({
      lineHeight: '1',
      paddingTop: '0px',
      paddingBottom: '0px',
    });
    expect(r.cells[2]!.style.minHeight).toBe('0px');
    expect(r.bodyMarked).toBe(false);
  });

  it('never goes below the zoom cap or the font floor, and marks a sheet that still overflows', () => {
    const r = runFit([12, 9], () => 3000, 2);
    expect(r.zoom).toBeCloseTo(PETITION_MIN_SHEET_ZOOM);
    for (const size of printedSizes(r)) {
      expect(size).toBeGreaterThanOrEqual(PETITION_MIN_VARIABLE_PX - 1e-9);
    }
    expect(
      r.sheets.map((s) => s.sheet.hasAttribute('data-petition-overflow')),
    ).toEqual([true, true]);
    expect(r.sheets[0]!.sheet.style).toEqual({
      height: 'auto',
      minHeight: '14in',
      breakAfter: 'page',
    });
    expect(r.bodyMarked).toBe(true);
  });

  it('starts later sheets from the level the previous sheet needed', () => {
    const r = runFit([12, 9], (s) => 1200 + s.fontSizes[0]! * 12, 3);
    for (const s of r.sheets) {
      expect(s.cells.map((c) => c.style.fontSize)).toEqual([
        '10px',
        '',
        '10px',
      ]);
      expect(s.sheetNoBottom()).toBeLessThanOrEqual(LIMIT);
    }
    // Sheet 2: the initial check, then one check at the inherited level, then the final check.
    expect(r.sheets[1]!.measurements()).toBe(3);
    expect(r.sheets[0]!.measurements()).toBeGreaterThan(3);
  });
});

describe('petition overflow warnings', () => {
  it('reads the 1-based numbers of overflowing sheets from the page', async () => {
    const sheets = [fakeElement(), fakeElement(), fakeElement()];
    sheets[1]!.setAttribute('data-petition-overflow');
    const page = {
      $$eval: async <T>(selector: string, fn: (els: Element[]) => T) => {
        expect(selector).toBe('[data-petition-sheet]');
        return fn(sheets as unknown as Element[]);
      },
    };
    await expect(readPetitionOverflowSheets(page)).resolves.toEqual([2]);
  });

  it('words one, some and all overflowing sheets', () => {
    expect(petitionOverflowWarnings([], 3)).toEqual([]);
    expect(petitionOverflowWarnings([3], 3)[0]).toMatch(
      /^Sheet 3 runs onto a second page; shorten the candidate or vacancy-committee entries/,
    );
    expect(petitionOverflowWarnings([1, 3], 3)[0]).toMatch(/^Sheets 1, 3 run/);
    expect(petitionOverflowWarnings([1, 2, 3], 3)[0]).toMatch(
      /^All 3 sheets run/,
    );
  });
});

describe('generateHTML (designating petition)', () => {
  const html = generateHTML(
    [
      {
        name: 'PETC0001 TESTER',
        address: '1 MAIN ST, ROCHESTER, NY 14604',
        office: 'County Committee',
      },
      {
        name: 'PETC0002 TESTER',
        address: '2 MAIN ST, ROCHESTER, NY 14604',
        office: 'County Committee',
      },
    ],
    [{ name: 'PETV0001 TESTER', address: '1 ELM ST, ROCHESTER, NY 14604' }],
    'Democratic',
    '2026-06-23',
    3,
  );
  const count = (s: string) => html.split(s).length - 1;

  it('marks each sheet, its content, its sheet number and its fittable cells', () => {
    expect(count('data-petition-sheet=""')).toBe(3);
    expect(count('data-petition-content=""')).toBe(3);
    expect(count('data-petition-sheet-no=""')).toBe(3);
    // 3 cells per candidate + the vacancies box, per sheet.
    expect(count('data-petition-fit=""')).toBe(3 * (2 * 3 + 1));
  });

  it('runs the fit script once, after the last sheet', () => {
    expect(count(PETITION_FIT_SCRIPT)).toBe(1);
    expect(html.lastIndexOf('Sheet No. 3')).toBeLessThan(
      html.indexOf('<script>'),
    );
  });
});
