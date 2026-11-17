/** Marks multi-value inputs whose typed text becomes a chip when they lose focus. */
export const ADDS_CHIP_ON_BLUR_ATTR = "data-adds-chip-on-blur";

/**
 * The focused multi-value input, if it holds typed text that losing focus would turn into a chip.
 * A form can blur it before submitting, so the typed text is part of the search.
 */
export function focusedInputWithPendingChip(): HTMLInputElement | null {
  const el = typeof document === "undefined" ? null : document.activeElement;
  return el instanceof HTMLInputElement &&
    el.hasAttribute(ADDS_CHIP_ON_BLUR_ATTR) &&
    el.value.trim() !== ""
    ? el
    : null;
}
