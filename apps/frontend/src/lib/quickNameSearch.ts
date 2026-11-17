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
 * Adds the record search quick name box to search rows. Simple mode calls it with no rows, so the
 * box becomes the whole search; the merging rules below apply when rows are passed.
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

/**
 * The name box's values when switching to simple mode, taken from the builder's Name row. The
 * box is one plain text input per field, so a field with several names in the builder comes back
 * blank rather than showing only some of them.
 */
export function quickNameFromRows(rows: SearchField[]): QuickName {
  const row = rows.find((r) => r.compoundType && r.name === NAME_ROW);
  const single = (name: keyof QuickName) => {
    if (!row?.compoundType) return "";
    const values = toValues(row.fields.find((f) => f.name === name)?.value);
    return values.length === 1 ? values[0]! : "";
  };
  return { firstName: single("firstName"), lastName: single("lastName") };
}

/**
 * The builder's rows when switching to advanced mode, with the name box moved into the Name row.
 * A name in the box replaces that field's names. A blank box clears a field it was showing (one
 * name or none) but keeps a list of several names, which the box couldn't show. Both sub-fields
 * stay on the row, filled or not, so the builder renders the whole Name row. With no Name row and
 * nothing typed, the rows come back unchanged.
 */
export function moveQuickNameIntoRows(
  rows: SearchField[],
  quickName: QuickName,
): SearchField[] {
  const typed: QuickName = {
    firstName: quickName.firstName.trim(),
    lastName: quickName.lastName.trim(),
  };
  const existing = rows.find(
    (row) => row.compoundType && row.name === NAME_ROW,
  );
  if (!existing && !typed.firstName && !typed.lastName) return rows;

  const template = SEARCH_FIELDS.find(
    (field): field is CompoundSearchField =>
      field.compoundType && field.name === NAME_ROW,
  );
  const base = existing ?? (template ? addIdsIfMissing(template) : undefined);
  if (!base?.compoundType) return rows;

  const fields: BaseSearchField[] = base.fields.map((field) => {
    if (!isQuickNameField(field.name)) return field;
    const value = typed[field.name];
    if (value) return { ...field, value: [value] };
    return toValues(field.value).length > 1
      ? field
      : { ...field, value: undefined };
  });
  const nameRow: SearchField = { ...base, fields };

  return existing
    ? rows.map((row) => (row === existing ? nameRow : row))
    : [nameRow, ...rows];
}
