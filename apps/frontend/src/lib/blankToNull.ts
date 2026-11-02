/** Trims `value`; blank (or missing) becomes null, so "cleared" is stored as null. */
export function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}
