/**
 * Format-neutral readers for the scalar fields every roster format carries under a
 * different column name. A format's parser owns where a value comes from; these own
 * what counts as a valid value once it's read.
 */

/** Zero-padded district strings ("006") are base-10 integers, never octal. */
export const parseDistrict = (value: string): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : null;
};
