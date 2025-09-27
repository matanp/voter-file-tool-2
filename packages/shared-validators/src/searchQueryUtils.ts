import type { Prisma } from '@voter-file-tool/shared-prisma';
import type { SearchQueryField } from './schemas/report';
import { searchableFieldEnum, COMPUTED_BOOLEAN_FIELDS } from './constants';
import {
  isComputedBooleanSearchField,
  isValuesSearchField,
} from './searchQueryFieldGuards';

const NAME_FIELDS = new Set<string>([
  searchableFieldEnum.enum.firstName,
  searchableFieldEnum.enum.lastName,
]);

/**
 * Creates Prisma query conditions for finding records with valid emails
 * @returns Prisma where conditions for valid emails
 */
export function getValidEmailConditions(): Prisma.VoterRecordWhereInput {
  return {
    AND: [{ email: { not: null } }, { email: { not: '' } }],
    NOT: {
      OR: [
        // Missing @
        { email: { not: { contains: '@' } } },
        // Starts or ends with @
        { email: { startsWith: '@' } },
        { email: { endsWith: '@' } },
        // Missing dot (no domain part)
        { email: { not: { contains: '.' } } },
        // Starts or ends with dot
        { email: { startsWith: '.' } },
        { email: { endsWith: '.' } },
        // Contains spaces
        { email: { contains: ' ' } },
        // Double @ (should only be one)
        { email: { contains: '@@' } },
      ],
    },
  };
}

/**
 * Creates Prisma query conditions for finding records with invalid emails
 * @returns Prisma where conditions for invalid emails
 */
export function getInvalidEmailConditions(): Prisma.VoterRecordWhereInput {
  return {
    AND: [{ email: { not: null } }, { email: { not: '' } }],
    OR: [
      // Missing @
      { email: { not: { contains: '@' } } },
      // Starts or ends with @
      { email: { startsWith: '@' } },
      { email: { endsWith: '@' } },
      // Missing dot (no domain part)
      { email: { not: { contains: '.' } } },
      // Starts or ends with dot
      { email: { startsWith: '.' } },
      { email: { endsWith: '.' } },
      // Contains spaces
      { email: { contains: ' ' } },
      // Double @ (should only be one)
      { email: { contains: '@@' } },
    ],
  };
}

/**
 * Creates Prisma query conditions for finding records with any email (valid or invalid)
 * @returns Prisma where conditions for any email
 */
export function getHasEmailConditions(): Prisma.VoterRecordWhereInput {
  return {
    AND: [{ email: { not: null } }, { email: { not: '' } }],
  };
}

/**
 * Creates Prisma query conditions for finding records with phone numbers
 * @returns Prisma where conditions for phone numbers
 */
export function getHasPhoneConditions(): Prisma.VoterRecordWhereInput {
  return {
    AND: [{ telephone: { not: null } }, { telephone: { not: '' } }],
  };
}

/**
 * Builds a Prisma where clause from a search query array
 * This function is shared between frontend and backend to eliminate duplication
 * @param searchQuery - Array of search query fields
 * @returns Prisma where clause for voter records
 */
export function buildPrismaWhereClause(
  searchQuery: SearchQueryField[]
): Prisma.VoterRecordWhereInput {
  let query: Record<string, unknown> = {};
  const andConditions: Prisma.VoterRecordWhereInput[] = [];

  for (const field of searchQuery) {
    const fieldField = field.field;

    // Handle computed boolean fields (single value) with exhaustive switch on name
    if (isComputedBooleanSearchField(field)) {
      const name = fieldField as (typeof COMPUTED_BOOLEAN_FIELDS)[number];
      switch (name) {
        case 'hasEmail': {
          if (field.value === true) {
            andConditions.push(getHasEmailConditions());
          }
          break;
        }
        case 'hasInvalidEmail': {
          if (field.value === true) {
            andConditions.push(getInvalidEmailConditions());
          }
          break;
        }
        case 'hasPhone': {
          if (field.value === true) {
            andConditions.push(getHasPhoneConditions());
          }
          break;
        }
        default: {
          // Compile-time exhaustiveness: if a new computed boolean is added,
          // this assignment will fail unless handled above.
          const _exhaustiveCheck: never = name;
          void _exhaustiveCheck;
          break;
        }
      }
      continue;
    }

    // Handle other fields (array values)
    if (isValuesSearchField(field)) {
      // Filter out empty values and null values
      const validValues = field.values.filter(
        (value: unknown) => value !== '' && value !== null
      );

      if (validValues.length === 0) {
        continue;
      }

      if (NAME_FIELDS.has(fieldField as string)) {
        // For name fields, convert to uppercase and use OR condition for multiple values
        const upperCaseValues = validValues.map((value: unknown) =>
          String(value).trim().toUpperCase()
        );
        query = {
          ...query,
          [fieldField]: { in: upperCaseValues },
        };
      } else {
        query = { ...query, [fieldField]: { in: validValues } };
      }
    }
  }

  if (andConditions.length > 0) {
    query.AND = andConditions;
  }

  return query;
}
