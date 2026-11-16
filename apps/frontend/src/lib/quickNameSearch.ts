import type {
  BaseSearchField,
  CompoundSearchField,
  SearchField,
} from "~/types/searchFields";
import { SEARCH_FIELDS } from "~/lib/constants/searchFields";
import { addIdsIfMissing } from "~/lib/searchHelpers";

export type QuickName = { firstName: string; lastName: string };

const NAME_ROW = "name";

const toValues = (value: BaseSearchField["value"]): string[] =>
  Array.isArray(value)
    ? value
    : typeof value === "string" && value.trim() !== ""
      ? [value]
      : [];

/**
 * Adds the record search quick name box to the builder's rows, so both run as one search.
 *
 * The backend builds one `in` filter per field and a later entry for the same field replaces an
 * earlier one, so the quick name can't just be appended as a second Name row. Instead its values
 * join the builder's Name row (any listed name matches, as with several chips). With no Name row in
 * the builder, a new one goes first. Blank inputs are ignored.
 */
export function mergeQuickNameIntoRows(
  rows: SearchField[],
  quickName: QuickName,
): SearchField[] {
  const typed: Record<string, string> = {
    firstName: quickName.firstName.trim(),
    lastName: quickName.lastName.trim(),
  };
  if (!typed.firstName && !typed.lastName) return rows;

  const existing = rows.find(
    (row) => row.compoundType && row.name === NAME_ROW,
  );
  const template = SEARCH_FIELDS.find(
    (field): field is CompoundSearchField =>
      field.compoundType && field.name === NAME_ROW,
  );
  const base = existing ?? (template ? addIdsIfMissing(template) : undefined);
  if (!base?.compoundType) return rows;

  const subFieldNames = ["firstName", "lastName"];
  const fields: BaseSearchField[] = subFieldNames.flatMap((name) => {
    const current =
      base.fields.find((f) => f.name === name) ??
      template?.fields.find((f) => f.name === name);
    if (!current) return [];
    const values = toValues(current.value);
    const extra = typed[name];
    const merged =
      extra && !values.some((v) => v.toUpperCase() === extra.toUpperCase())
        ? [...values, extra]
        : values;
    return merged.length > 0 ? [{ ...current, value: merged }] : [];
  });
  const otherFields = base.fields.filter(
    (f) => !subFieldNames.includes(f.name),
  );
  const nameRow: SearchField = { ...base, fields: [...fields, ...otherFields] };

  return existing
    ? rows.map((row) => (row === existing ? nameRow : row))
    : [nameRow, ...rows];
}
