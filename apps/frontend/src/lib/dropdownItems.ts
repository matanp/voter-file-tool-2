export const dropdownItems = [
  "city",
  "zipCode",
  "street",
  "countyLegDistrict",
  "stateAssmblyDistrict",
  "stateSenateDistrict",
  "congressionalDistrict",
  "townCode",
  "electionDistrict",
  "party",
] as const;

export type DropdownItem = (typeof dropdownItems)[number];

/** Returns true when a field name maps to a DropdownLists column. */
export function isDropdownItem(value: string): value is DropdownItem {
  return dropdownItems.includes(value as DropdownItem);
}
