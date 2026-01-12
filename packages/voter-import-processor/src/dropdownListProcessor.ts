// Dropdown list processing for voter records

import type { PrismaClient } from '@prisma/client';
import type { VoterRecordArchiveStrings } from './types';

/**
 * Dropdown items that should be extracted from voter records
 */
export const dropdownItems = [
  'city',
  'zipCode',
  'street',
  'countyLegDistrict',
  'stateAssmblyDistrict',
  'stateSenateDistrict',
  'congressionalDistrict',
  'townCode',
  'electionDistrict',
  'party',
] as const;

export type DropdownItem = (typeof dropdownItems)[number];

const dropdownLists = new Map<DropdownItem, Set<string>>();

/**
 * Safely get dropdown array with empty fallback
 */
function getDropdownArray(key: DropdownItem): string[] {
  const values = dropdownLists.get(key);
  return values ? Array.from(values) : [];
}

/**
 * Process a voter record to extract dropdown list values
 */
export function processRecordForDropdownLists(
  record: VoterRecordArchiveStrings
) {
  for (const key of dropdownItems) {
    const value = record[key]?.trim();
    if (value) {
      if (!dropdownLists.get(key)) {
        dropdownLists.set(key, new Set());
      }

      if (!dropdownLists.get(key)?.has(value)) {
        dropdownLists.set(key, dropdownLists.get(key)!.add(value));
      }
    }
  }
}

/**
 * Save all dropdown lists to the database
 * Updates existing dropdown lists with new values
 */
export async function bulkSaveDropdownLists(prisma: PrismaClient) {
  const existingDropdownLists = await prisma.dropdownLists.findMany();

  if (existingDropdownLists.length > 1) {
    throw new Error('More than one dropdown list exists');
  }

  const existingLists = existingDropdownLists[0];

  if (existingLists) {
    for (const [key, values] of Array.from(dropdownLists.entries())) {
      if (existingLists[key]) {
        const existingValues = new Set(existingLists[key]);
        dropdownLists.set(key, new Set([...existingValues, ...values]));
      }
    }
  }

  await prisma.dropdownLists.upsert({
    where: {
      id: existingLists?.id ?? 1,
    },
    create: {
      city: getDropdownArray('city').sort(),
      zipCode: getDropdownArray('zipCode').sort(),
      street: getDropdownArray('street').sort(),
      countyLegDistrict: getDropdownArray('countyLegDistrict').sort(),
      stateAssmblyDistrict: getDropdownArray('stateAssmblyDistrict').sort(),
      stateSenateDistrict: getDropdownArray('stateSenateDistrict').sort(),
      congressionalDistrict: getDropdownArray('congressionalDistrict').sort(),
      townCode: getDropdownArray('townCode').sort(),
      electionDistrict: getDropdownArray('electionDistrict'),
      party: getDropdownArray('party').sort(),
    },
    update: {
      city: getDropdownArray('city'),
      zipCode: getDropdownArray('zipCode'),
      street: getDropdownArray('street'),
      countyLegDistrict: getDropdownArray('countyLegDistrict'),
      stateAssmblyDistrict: getDropdownArray('stateAssmblyDistrict'),
      stateSenateDistrict: getDropdownArray('stateSenateDistrict'),
      congressionalDistrict: getDropdownArray('congressionalDistrict'),
      townCode: getDropdownArray('townCode'),
      electionDistrict: getDropdownArray('electionDistrict'),
      party: getDropdownArray('party'),
    },
  });
}

/**
 * Clear dropdown lists (for cleanup between processing runs)
 */
export function clearDropdownLists() {
  dropdownLists.clear();
}
