import type { Prisma } from '@voter-file-tool/shared-prisma';
import type { SearchQueryField } from './schemas/report';
import { searchableFieldEnum } from './constants';

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
    if (field.value !== '' && field.value !== null) {
      const fieldField = field.field;

      // Handle email search criteria
      if (fieldField === 'hasEmail') {
        if (field.value === true) {
          andConditions.push(getHasEmailConditions());
        }
      } else if (fieldField === 'hasInvalidEmail') {
        if (field.value === true) {
          andConditions.push(getInvalidEmailConditions());
        }
      } else if (fieldField === 'hasPhone') {
        if (field.value === true) {
          andConditions.push(getHasPhoneConditions());
        }
      } else if (
        fieldField === searchableFieldEnum.enum.firstName ||
        fieldField === searchableFieldEnum.enum.lastName
      ) {
        const value = field.value;
        if (value === null || value === undefined) {
          continue;
        }
        query = {
          ...query,
          [fieldField]: String(value).trim().toUpperCase(),
        };
      } else {
        query = { ...query, [fieldField]: field.value };
      }
    }
  }

  if (andConditions.length > 0) {
    query.AND = andConditions;
  }

  return query;
}
