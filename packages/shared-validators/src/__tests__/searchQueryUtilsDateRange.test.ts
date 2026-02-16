import {
  buildPrismaWhereClause,
  getHasEmailConditions,
} from '@voter-file-tool/shared-validators';
import type { SearchQueryField } from '@voter-file-tool/shared-validators';

describe('buildPrismaWhereClause - DateRange', () => {
  it('handles date range with both start and end dates', () => {
    const searchQuery: SearchQueryField[] = [
      {
        field: 'DOB',
        range: {
          startDate: '2023-01-01T00:00:00.000Z',
          endDate: '2023-12-31T23:59:59.999Z',
        },
      },
    ];

    const result = buildPrismaWhereClause(searchQuery);

    expect(result).toEqual({
      AND: [
        {
          AND: [
            { DOB: { gte: '2023-01-01T00:00:00.000Z' } },
            { DOB: { lte: '2023-12-31T23:59:59.999Z' } },
          ],
        },
      ],
    });
  });

  it('handles date range with only start date', () => {
    const searchQuery: SearchQueryField[] = [
      {
        field: 'DOB',
        range: {
          startDate: '2023-01-01T00:00:00.000Z',
          endDate: null,
        },
      },
    ];

    const result = buildPrismaWhereClause(searchQuery);

    expect(result).toEqual({
      AND: [
        {
          AND: [{ DOB: { gte: '2023-01-01T00:00:00.000Z' } }],
        },
      ],
    });
  });

  it('handles date range with only end date', () => {
    const searchQuery: SearchQueryField[] = [
      {
        field: 'DOB',
        range: {
          startDate: null,
          endDate: '2023-12-31T23:59:59.999Z',
        },
      },
    ];

    const result = buildPrismaWhereClause(searchQuery);

    expect(result).toEqual({
      AND: [
        {
          AND: [{ DOB: { lte: '2023-12-31T23:59:59.999Z' } }],
        },
      ],
    });
  });

  it('handles date range with null dates', () => {
    const searchQuery: SearchQueryField[] = [
      {
        field: 'DOB',
        range: {
          startDate: null,
          endDate: null,
        },
      },
    ];

    const result = buildPrismaWhereClause(searchQuery);

    expect(result).toEqual({});
  });

  it('combines date range with other field conditions', () => {
    const searchQuery: SearchQueryField[] = [
      {
        field: 'DOB',
        range: {
          startDate: '2023-01-01T00:00:00.000Z',
          endDate: '2023-12-31T23:59:59.999Z',
        },
      },
      {
        field: 'firstName',
        values: ['John', 'Jane'],
      },
    ];

    const result = buildPrismaWhereClause(searchQuery);

    expect(result).toEqual({
      firstName: { in: ['JOHN', 'JANE'] },
      AND: [
        {
          AND: [
            { DOB: { gte: '2023-01-01T00:00:00.000Z' } },
            { DOB: { lte: '2023-12-31T23:59:59.999Z' } },
          ],
        },
      ],
    });
  });

  it('handles multiple date range fields', () => {
    const searchQuery: SearchQueryField[] = [
      {
        field: 'DOB',
        range: {
          startDate: '1990-01-01T00:00:00.000Z',
          endDate: '2000-12-31T23:59:59.999Z',
        },
      },
      {
        field: 'lastUpdate',
        range: {
          startDate: '2023-01-01T00:00:00.000Z',
          endDate: null,
        },
      },
    ];

    const result = buildPrismaWhereClause(searchQuery);

    expect(result).toEqual({
      AND: [
        {
          AND: [
            { DOB: { gte: '1990-01-01T00:00:00.000Z' } },
            { DOB: { lte: '2000-12-31T23:59:59.999Z' } },
          ],
        },
        {
          AND: [{ lastUpdate: { gte: '2023-01-01T00:00:00.000Z' } }],
        },
      ],
    });
  });

  it('handles date range with computed boolean fields', () => {
    const searchQuery: SearchQueryField[] = [
      {
        field: 'DOB',
        range: {
          startDate: '2023-01-01T00:00:00.000Z',
          endDate: '2023-12-31T23:59:59.999Z',
        },
      },
      {
        field: 'hasEmail',
        value: true,
      },
    ];

    const result = buildPrismaWhereClause(searchQuery);

    expect(result).toEqual({
      AND: [
        {
          AND: [
            { DOB: { gte: '2023-01-01T00:00:00.000Z' } },
            { DOB: { lte: '2023-12-31T23:59:59.999Z' } },
          ],
        },
        getHasEmailConditions(),
      ],
    });
  });
});
