/**
 * Page and table geometry of the sign-in sheet. The component lays itself out
 * from these values, and the text fitter derives each column's usable width
 * from them, so a column change here moves both together.
 */

export const CSS_PX_PER_INCH = 96;

/** Legal landscape. */
export const PAGE_WIDTH_IN = 14;
export const PAGE_HEIGHT_IN = 8.5;
export const PAGE_PADDING_X_IN = 0.65;
export const PAGE_PADDING_TOP_IN = 0.7;
export const PAGE_PADDING_BOTTOM_IN = 0.35;

export const CELL_PADDING_X_PX = 8;
export const CELL_BORDER_PX = 1;
export const PROXY_DIVIDER_PX = 2;
export const TABLE_BORDER_PX = 2;

/** Shares of the table width, from the reference's approximate 4/21/26/13/17/10/10. */
export const SIGN_IN_SHEET_COLUMNS = [
  { key: 'ed', label: 'ED', widthPercent: 4 },
  { key: 'name', label: 'Member name', widthPercent: 20.8 },
  { key: 'email', label: 'Email on file', widthPercent: 25.7 },
  { key: 'phone', label: 'Phone on file', widthPercent: 12.9 },
  { key: 'signature', label: 'Member signature', widthPercent: 16.8 },
  { key: 'proxyName', label: 'Proxy name (print)', widthPercent: 9.9 },
  { key: 'proxySignature', label: 'Proxy signature', widthPercent: 9.9 },
] as const;

export type SignInSheetColumnKey =
  (typeof SIGN_IN_SHEET_COLUMNS)[number]['key'];

/** The heavier divider sits on this column's left edge. */
export const FIRST_PROXY_COLUMN: SignInSheetColumnKey = 'proxyName';

/** Fitted text is measured against this share of a cell's content width. */
export const TEXT_FIT_SAFETY = 0.9;

const TABLE_WIDTH_PX =
  (PAGE_WIDTH_IN - 2 * PAGE_PADDING_X_IN) * CSS_PX_PER_INCH;

/**
 * Width available to text in a column, after the safety margin. Counts both of
 * the cell's side borders in full, which overstates collapsed borders a little.
 */
export function usableColumnWidthPx(key: SignInSheetColumnKey): number {
  const column = SIGN_IN_SHEET_COLUMNS.find((c) => c.key === key);
  if (!column) throw new Error(`Unknown sign-in sheet column: ${key}`);

  const leftBorder =
    key === FIRST_PROXY_COLUMN ? PROXY_DIVIDER_PX : CELL_BORDER_PX;
  const contentWidth =
    (column.widthPercent / 100) * (TABLE_WIDTH_PX - 2 * TABLE_BORDER_PX) -
    2 * CELL_PADDING_X_PX -
    leftBorder -
    CELL_BORDER_PX;
  return contentWidth * TEXT_FIT_SAFETY;
}
