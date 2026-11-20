/**
 * Keeps every Designating Petition sheet on one Legal page.
 *
 * Long candidate names, offices or addresses (or many candidates) make the candidate
 * table taller, which pushed "Sheet No." and the notary box past the fixed 14in sheet.
 * This script runs in the PDF browser after layout. For each sheet whose "Sheet No."
 * line ends less than 0.25in above the sheet's bottom edge it, in order, stopping as
 * soon as it fits:
 *
 * 1. tightens line height and vertical padding of the candidate cells and the
 *    vacancies box (`data-petition-fit`) and drops their fixed minimum height;
 * 2. shrinks their font, 1px at a time, down to 8px (never growing a cell);
 * 3. as a last resort, zooms the whole sheet content down until it fits.
 *
 * A sheet that already fits is left alone, so short-value sheets render as before
 * (a two-candidate short sheet ends about 0.6in above the edge).
 */
export const PETITION_FIT_SCRIPT = `(function () {
  function overflows(sheet) {
    var sheetNo = sheet.querySelector('[data-petition-sheet-no]');
    if (!sheetNo) return false;
    // 24px = 0.25in: keep "Sheet No." clear of a printer's unprintable edge.
    return sheetNo.getBoundingClientRect().bottom > sheet.getBoundingClientRect().bottom - 24;
  }
  var sheets = document.querySelectorAll('[data-petition-sheet]');
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    if (!overflows(sheet)) continue;
    var cells = sheet.querySelectorAll('[data-petition-fit]');
    var sizes = [];
    for (var c = 0; c < cells.length; c++) {
      sizes.push(parseFloat(getComputedStyle(cells[c]).fontSize));
      cells[c].style.lineHeight = '1.2';
      cells[c].style.paddingTop = '2px';
      cells[c].style.paddingBottom = '2px';
      cells[c].style.height = 'auto';
    }
    for (var px = 11; px >= 8 && overflows(sheet); px--) {
      for (var k = 0; k < cells.length; k++) {
        cells[k].style.fontSize = Math.min(px, sizes[k]) + 'px';
      }
    }
    var content = sheet.querySelector('[data-petition-content]');
    for (var zoom = 0.98; content && zoom >= 0.5 && overflows(sheet); zoom -= 0.02) {
      content.style.zoom = String(zoom);
    }
  }
})();`;
