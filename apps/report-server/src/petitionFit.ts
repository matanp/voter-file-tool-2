/**
 * Keeps every Designating Petition sheet on one Legal page.
 *
 * Long candidate names, offices or addresses (or many candidates) make the candidate
 * table taller, which pushed "Sheet No." and the notary box past the fixed 14in sheet.
 * This script runs in the PDF browser after layout. A sheet is too tall when its
 * "Sheet No." line ends less than 0.25in above the sheet's bottom edge. For each such
 * sheet it tries these levels, in order, and stops at the first that fits:
 *
 * 1. Tighten the variable blocks, meaning the candidate cells and the vacancies box
 *    (`data-petition-fit`): line height 1.2, 2px vertical padding, and the candidate
 *    cells drop their fixed row height.
 * 2. Shrink the variable blocks' font 1px at a time: 11, 10, 9, 8px. A cell that is
 *    already smaller never grows.
 * 3. Zoom the whole sheet content 2% at a time, down to `PETITION_MIN_SHEET_ZOOM`
 *    (90%). The variable blocks' font is scaled up to compensate, so it never prints
 *    below `PETITION_MIN_VARIABLE_PX`.
 * 4. At 90%, squeeze only the variable blocks: line height 1.0, no vertical padding,
 *    and the vacancies box drops its blank minimum height.
 *
 * The signature rows, witness statement and notary box never go below 90%.
 *
 * Why the variable text stops at 8px (6pt) printed: that is the size of the address
 * column's text at 90% zoom, and about the smallest size used for printed fine print
 * that is still readable on paper. Going smaller would make the candidate names,
 * which the board of elections checks, hard to read just to fit one page.
 *
 * If no level fits, the sheet is printed at the last level anyway: it grows onto a
 * second page and the next sheet starts on a fresh page, rather than its overflow
 * being painted over the next sheet. It is marked `data-petition-overflow`, and the
 * report server reads that mark after `setContent` and records a warning
 * (`readPetitionOverflowSheets`).
 *
 * Sheets differ only in their number, so each sheet starts from the level the
 * previous one needed. A sheet that already fits is left alone, so short-value
 * sheets render exactly as before.
 */
export const PETITION_MIN_SHEET_ZOOM = 0.9;
export const PETITION_MIN_VARIABLE_PX = 8;

export const PETITION_FIT_SCRIPT = `(function () {
  var MIN_ZOOM_PCT = ${Math.round(PETITION_MIN_SHEET_ZOOM * 100)};
  var MIN_PX = ${PETITION_MIN_VARIABLE_PX};
  function overflows(sheet) {
    var sheetNo = sheet.querySelector('[data-petition-sheet-no]');
    if (!sheetNo) return false;
    // 24px = 0.25in: keep "Sheet No." clear of a printer's unprintable edge.
    return sheetNo.getBoundingClientRect().bottom > sheet.getBoundingClientRect().bottom - 24;
  }
  // Levels from least to most compact. Each one fully describes the variable blocks.
  var levels = [{ px: null, zoom: 100, squeeze: false }];
  for (var p = 11; p >= MIN_PX; p--) levels.push({ px: p, zoom: 100, squeeze: false });
  for (var z = 98; z >= MIN_ZOOM_PCT; z -= 2) {
    // Scale the font up to compensate, so px * zoom stays at MIN_PX.
    levels.push({ px: Math.ceil((MIN_PX * 100 / z) * 100) / 100, zoom: z, squeeze: false });
  }
  var last = levels[levels.length - 1];
  levels.push({ px: last.px, zoom: last.zoom, squeeze: true });

  function apply(sheet, cells, sizes, level) {
    for (var k = 0; k < cells.length; k++) {
      var cell = cells[k];
      cell.style.lineHeight = level.squeeze ? '1' : '1.2';
      cell.style.paddingTop = level.squeeze ? '0px' : '2px';
      cell.style.paddingBottom = level.squeeze ? '0px' : '2px';
      if (cell.tagName === 'TD') cell.style.height = 'auto';
      else cell.style.minHeight = level.squeeze ? '0px' : '';
      cell.style.fontSize = level.px !== null && sizes[k] > level.px ? level.px + 'px' : '';
    }
    var content = sheet.querySelector('[data-petition-content]');
    if (content) content.style.zoom = level.zoom < 100 ? String(level.zoom / 100) : '';
  }

  var start = 0;
  var sheets = document.querySelectorAll('[data-petition-sheet]');
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    if (!overflows(sheet)) continue;
    var cells = sheet.querySelectorAll('[data-petition-fit]');
    var sizes = [];
    for (var c = 0; c < cells.length; c++) {
      sizes.push(parseFloat(getComputedStyle(cells[c]).fontSize));
    }
    var n = start;
    apply(sheet, cells, sizes, levels[n]);
    while (n < levels.length - 1 && overflows(sheet)) {
      n++;
      apply(sheet, cells, sizes, levels[n]);
    }
    start = n;
    if (overflows(sheet)) {
      // Let the sheet grow onto a second page and start the next sheet on a fresh
      // page, instead of painting its overflow over the next sheet.
      sheet.style.height = 'auto';
      sheet.style.minHeight = '14in';
      sheet.style.breakAfter = 'page';
      sheet.setAttribute('data-petition-overflow', '');
      document.body.setAttribute('data-petition-overflow', '');
    }
  }
})();`;

/** The slice of a Puppeteer page used to read the fit result. */
export type PetitionOverflowPage = {
  $$eval<T>(selector: string, fn: (elements: Element[]) => T): Promise<T>;
};

/** 1-based numbers of the sheets the fit script could not keep on one page. */
export async function readPetitionOverflowSheets(
  page: PetitionOverflowPage,
): Promise<number[]> {
  return page.$$eval('[data-petition-sheet]', (sheets) =>
    sheets.flatMap((sheet, i) =>
      sheet.hasAttribute('data-petition-overflow') ? [i + 1] : [],
    ),
  );
}

/** The warning stored on the report for sheets that run onto a second page. */
export function petitionOverflowWarnings(
  overflowSheets: number[],
  totalSheets: number,
): string[] {
  if (overflowSheets.length === 0) return [];
  const advice =
    'shorten the candidate or vacancy-committee entries so each sheet fits on one page';
  if (overflowSheets.length === 1) {
    return [`Sheet ${overflowSheets[0]} runs onto a second page; ${advice}.`];
  }
  if (overflowSheets.length === totalSheets) {
    return [`All ${totalSheets} sheets run onto a second page; ${advice}.`];
  }
  return [
    `Sheets ${overflowSheets.join(', ')} run onto a second page; ${advice}.`,
  ];
}
