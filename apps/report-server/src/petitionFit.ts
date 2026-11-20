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
 *    vacancies box (`data-petition-fit`) and drops the candidate cells' fixed row
 *    height (the vacancies box keeps its minimum height: it is a form field);
 * 2. shrinks their font, 1px at a time, down to 8px (never growing a cell);
 * 3. as a last resort, zooms the whole sheet content down until it fits.
 *
 * Sheets differ only in their number, so the steps found for the first overflowing
 * sheet are applied straight to the next ones (then checked again) instead of being
 * searched for each sheet. If even 50% zoom doesn't fit, the body gets
 * `data-petition-overflow` and a console warning, so the overflow isn't silent.
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
  // Shrinks every fit cell to px, never growing one that is already smaller.
  function setFont(cells, sizes, px) {
    for (var k = 0; k < cells.length; k++) {
      if (sizes[k] > px) cells[k].style.fontSize = px + 'px';
    }
  }
  // Starting points for the next sheet: font step and zoom (in %) the last sheet needed.
  var startPx = 12;
  var startZoom = 100;
  var sheets = document.querySelectorAll('[data-petition-sheet]');
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    if (!overflows(sheet)) continue;
    var cells = sheet.querySelectorAll('[data-petition-fit]');
    var sizes = [];
    for (var c = 0; c < cells.length; c++) {
      sizes.push(parseFloat(getComputedStyle(cells[c]).fontSize));
    }
    for (var t = 0; t < cells.length; t++) {
      cells[t].style.lineHeight = '1.2';
      cells[t].style.paddingTop = '2px';
      cells[t].style.paddingBottom = '2px';
      cells[t].style.height = 'auto';
    }
    // Jump straight to the previous sheet's font step (12 = unchanged), then shrink on.
    var px = startPx;
    if (px < 12) setFont(cells, sizes, px);
    while (px > 8 && overflows(sheet)) {
      px--;
      setFont(cells, sizes, px);
    }
    var content = sheet.querySelector('[data-petition-content]');
    var zoom = startZoom;
    if (content && zoom < 100) content.style.zoom = String(zoom / 100);
    while (content && zoom > 50 && overflows(sheet)) {
      zoom -= 2;
      content.style.zoom = String(zoom / 100);
    }
    startPx = px;
    startZoom = zoom;
    if (overflows(sheet)) {
      document.body.setAttribute('data-petition-overflow', '');
      console.warn('designating petition sheet ' + (i + 1) + ' still overflows its page');
    }
  }
})();`;
