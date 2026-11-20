import { generateHTML } from '../utils';
import { PETITION_FIT_SCRIPT } from '../petitionFit';

const SHEET_HEIGHT = 1344; // 14in at 96px/in
const LIMIT = SHEET_HEIGHT - 24; // "Sheet No." must end 0.25in above the edge

type FakeCell = {
  base: number;
  style: {
    fontSize?: string;
    lineHeight?: string;
    paddingTop?: string;
    paddingBottom?: string;
    height?: string;
  };
};

/**
 * Fake sheets whose "Sheet No." bottom is `contentHeight(cells, tightened)`, scaled by
 * the content zoom. Enough to exercise the script's step order without a browser.
 */
function runFit(
  cellSizes: number[],
  contentHeight: (fontSizes: number[], tightened: boolean) => number,
  sheetCount = 1,
) {
  const sheets = Array.from({ length: sheetCount }, () => {
    const cells: FakeCell[] = cellSizes.map((base) => ({ base, style: {} }));
    const content = { style: { zoom: '' } };
    let measurements = 0;
    const fontSizes = () =>
      cells.map((c) =>
        c.style.fontSize ? parseFloat(c.style.fontSize) : c.base,
      );
    const sheetNoBottom = () => {
      const zoom = content.style.zoom ? parseFloat(content.style.zoom) : 1;
      return (
        contentHeight(fontSizes(), cells[0]?.style.lineHeight === '1.2') * zoom
      );
    };
    const sheet = {
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
      content,
      sheetNoBottom,
      measurements: () => measurements,
    };
  });
  const bodyAttributes: string[] = [];
  const document = {
    querySelectorAll: () => sheets.map((s) => s.sheet),
    body: { setAttribute: (name: string) => bodyAttributes.push(name) },
  };
  const getComputedStyle = (el: FakeCell) => ({ fontSize: `${el.base}px` });
  const warnings: string[] = [];
  const fakeConsole = { warn: (msg: string) => warnings.push(msg) };
  new Function('document', 'getComputedStyle', 'console', PETITION_FIT_SCRIPT)(
    document,
    getComputedStyle,
    fakeConsole,
  );
  const first = sheets[0]!;
  return {
    cells: first.cells,
    zoom: first.content.style.zoom,
    sheetNoBottom: first.sheetNoBottom(),
    sheets,
    bodyAttributes,
    warnings,
  };
}

describe('petition fit script', () => {
  it('leaves a sheet that already fits untouched', () => {
    const { cells, zoom } = runFit([12, 12, 9], () => 1284);
    expect(cells.every((c) => Object.keys(c.style).length === 0)).toBe(true);
    expect(zoom).toBe('');
  });

  it('stops after tightening when that is enough', () => {
    const { cells, zoom, sheetNoBottom } = runFit(
      [12, 12, 9],
      (_, tightened) => (tightened ? 1300 : 1366),
    );
    expect(cells[0]!.style).toMatchObject({
      lineHeight: '1.2',
      paddingTop: '2px',
      paddingBottom: '2px',
      height: 'auto',
    });
    expect(cells.every((c) => c.style.fontSize === undefined)).toBe(true);
    expect(zoom).toBe('');
    expect(sheetNoBottom).toBeLessThanOrEqual(LIMIT);
  });

  it('shrinks fonts to the first size that fits and never grows a smaller cell', () => {
    // Fits once the 12px cells are at 10px.
    const { cells, zoom } = runFit(
      [12, 12, 9],
      (sizes) => 1200 + sizes[0]! * 12,
    );
    expect(cells.map((c) => c.style.fontSize)).toEqual([
      '10px',
      '10px',
      undefined,
    ]);
    expect(zoom).toBe('');
  });

  it('zooms the sheet content as a last resort', () => {
    const { cells, zoom, sheetNoBottom } = runFit([12, 9], () => 1450);
    expect(cells.map((c) => c.style.fontSize)).toEqual(['8px', '8px']);
    expect(parseFloat(zoom)).toBeLessThan(1);
    expect(sheetNoBottom).toBeLessThanOrEqual(LIMIT);
  });

  it('flags a sheet that still overflows at 50% zoom instead of failing silently', () => {
    const { zoom, bodyAttributes, warnings } = runFit([12], () => 3000);
    expect(zoom).toBe('0.5');
    expect(bodyAttributes).toEqual(['data-petition-overflow']);
    expect(warnings).toHaveLength(1);
  });

  it('starts later sheets from the step the first sheet needed', () => {
    const { sheets, bodyAttributes } = runFit(
      [12, 9],
      (sizes) => 1200 + sizes[0]! * 12,
      3,
    );
    for (const s of sheets) {
      expect(s.cells.map((c) => c.style.fontSize)).toEqual(['10px', undefined]);
      expect(s.sheetNoBottom()).toBeLessThanOrEqual(LIMIT);
    }
    // Sheet 2: initial check, one at 10px, the zoom loop's check, the final check.
    expect(sheets[1]!.measurements()).toBe(4);
    expect(sheets[0]!.measurements()).toBeGreaterThan(4);
    expect(bodyAttributes).toEqual([]);
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
