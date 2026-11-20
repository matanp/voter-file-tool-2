import { buildPrismaWhereClause } from '@voter-file-tool/shared-validators';
import type { SearchQueryField } from '@voter-file-tool/shared-validators';

/**
 * Voter-record date columns hold calendar dates at UTC midnight, or at Pacific
 * midnight (07:00/08:00Z) for rows imported from a Pacific machine. A date
 * search therefore matches the whole UTC day, and a range includes both of
 * its end days.
 */
describe('buildPrismaWhereClause - date fields match whole UTC days', () => {
  it('matches a single date over its whole UTC day', () => {
    const searchQuery: SearchQueryField[] = [
      { field: 'DOB', values: ['1960-12-12T00:00:00.000Z'] },
    ];

    expect(buildPrismaWhereClause(searchQuery)).toEqual({
      AND: [
        {
          DOB: {
            gte: '1960-12-12T00:00:00.000Z',
            lt: '1960-12-13T00:00:00.000Z',
          },
        },
      ],
    });
  });

  it('snaps a value carrying a time of day to its UTC day', () => {
    const searchQuery: SearchQueryField[] = [
      { field: 'originalRegDate', values: ['2004-03-05T08:00:00.000Z'] },
    ];

    expect(buildPrismaWhereClause(searchQuery)).toEqual({
      AND: [
        {
          originalRegDate: {
            gte: '2004-03-05T00:00:00.000Z',
            lt: '2004-03-06T00:00:00.000Z',
          },
        },
      ],
    });
  });

  it('ORs several single dates', () => {
    const searchQuery: SearchQueryField[] = [
      {
        field: 'DOB',
        values: ['1960-12-12T00:00:00.000Z', '1972-03-05T00:00:00.000Z'],
      },
    ];

    expect(buildPrismaWhereClause(searchQuery)).toEqual({
      AND: [
        {
          OR: [
            {
              DOB: {
                gte: '1960-12-12T00:00:00.000Z',
                lt: '1960-12-13T00:00:00.000Z',
              },
            },
            {
              DOB: {
                gte: '1972-03-05T00:00:00.000Z',
                lt: '1972-03-06T00:00:00.000Z',
              },
            },
          ],
        },
      ],
    });
  });

  it('includes both end days of a range, from the start of the first day', () => {
    const searchQuery: SearchQueryField[] = [
      {
        field: 'DOB',
        range: {
          startDate: '1960-12-10T17:42:00.000Z',
          endDate: '1960-12-12T00:00:00.000Z',
        },
      },
    ];

    expect(buildPrismaWhereClause(searchQuery)).toEqual({
      AND: [
        {
          AND: [
            { DOB: { gte: '1960-12-10T00:00:00.000Z' } },
            { DOB: { lt: '1960-12-13T00:00:00.000Z' } },
          ],
        },
      ],
    });
  });

  it('treats a one-day range like a single date', () => {
    const searchQuery: SearchQueryField[] = [
      {
        field: 'DOB',
        range: {
          startDate: '1960-12-12T00:00:00.000Z',
          endDate: '1960-12-12T00:00:00.000Z',
        },
      },
    ];

    expect(buildPrismaWhereClause(searchQuery)).toEqual({
      AND: [
        {
          AND: [
            { DOB: { gte: '1960-12-12T00:00:00.000Z' } },
            { DOB: { lt: '1960-12-13T00:00:00.000Z' } },
          ],
        },
      ],
    });
  });
});
