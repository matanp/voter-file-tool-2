import type {
  BaseSearchField,
  CompoundSearchField,
  SearchField,
} from "~/types/searchFields";
import { SEARCH_FIELDS } from "~/lib/constants/searchFields";
import { addIdsIfMissing } from "~/lib/searchHelpers";

export type QuickName = { firstName: string; lastName: string };

const NAME_ROW = "name";
const QUICK_NAME_FIELDS: readonly (keyof QuickName)[] = [
  "firstName",
  "lastName",
];
const isQuickNameField = (name: string): name is keyof QuickName =>
  (QUICK_NAME_FIELDS as readonly string[]).includes(name);

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
 * earlier one, so the quick name can't just be appended as a second Name row. Instead it goes into
 * the builder's Name row. A name typed in the box replaces the builder's names for that field
 * (first or last), so the box narrows the search to the name typed there rather than adding it as
 * an alternative. A field left blank in the box keeps the builder's names. With no Name row in the
 * builder, a new one goes first.
 */
export function mergeQuickNameIntoRows(
  rows: SearchField[],
  quickName: QuickName,
): SearchField[] {
  const typed: QuickName = {
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

  const fields: BaseSearchField[] = QUICK_NAME_FIELDS.flatMap((name) => {
    const current =
      base.fields.find((f) => f.name === name) ??
      template?.fields.find((f) => f.name === name);
    if (!current) return [];
    const values = typed[name] ? [typed[name]] : toValues(current.value);
    return values.length > 0 ? [{ ...current, value: values }] : [];
  });
  const otherFields = base.fields.filter((f) => !isQuickNameField(f.name));
  const nameRow: SearchField = { ...base, fields: [...fields, ...otherFields] };

  return existing
    ? rows.map((row) => (row === existing ? nameRow : row))
    : [nameRow, ...rows];
}
