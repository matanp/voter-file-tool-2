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
      city: Array.from(dropdownLists.get('city')!).sort(),
      zipCode: Array.from(dropdownLists.get('zipCode')!).sort(),
      street: Array.from(dropdownLists.get('street')!).sort(),
      countyLegDistrict: Array.from(
        dropdownLists.get('countyLegDistrict')!
      ).sort(),
      stateAssmblyDistrict: Array.from(
        dropdownLists.get('stateAssmblyDistrict')!
      ).sort(),
      stateSenateDistrict: Array.from(
        dropdownLists.get('stateSenateDistrict')!
      ).sort(),
      congressionalDistrict: Array.from(
        dropdownLists.get('congressionalDistrict')!
      ).sort(),
      townCode: Array.from(dropdownLists.get('townCode')!).sort(),
      electionDistrict: Array.from(dropdownLists.get('electionDistrict')!),
      party: Array.from(dropdownLists.get('party')!).sort(),
    },
    update: {
      city: Array.from(dropdownLists.get('city')!),
      zipCode: Array.from(dropdownLists.get('zipCode')!),
      street: Array.from(dropdownLists.get('street')!),
      countyLegDistrict: Array.from(dropdownLists.get('countyLegDistrict')!),
      stateAssmblyDistrict: Array.from(
        dropdownLists.get('stateAssmblyDistrict')!
      ),
      stateSenateDistrict: Array.from(
        dropdownLists.get('stateSenateDistrict')!
      ),
      congressionalDistrict: Array.from(
        dropdownLists.get('congressionalDistrict')!
      ),
      townCode: Array.from(dropdownLists.get('townCode')!),
      electionDistrict: Array.from(dropdownLists.get('electionDistrict')!),
      party: Array.from(dropdownLists.get('party')!),
    },
  });
}

/**
 * Clear dropdown lists (for cleanup between processing runs)
 */
export function clearDropdownLists() {
  dropdownLists.clear();
}
