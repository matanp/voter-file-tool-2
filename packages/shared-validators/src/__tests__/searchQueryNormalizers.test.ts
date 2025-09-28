import { normalizeSearchQueryField } from '../searchQueryNormalizers';
import type { SearchQueryField } from '../schemas/report';

describe('normalizeSearchQueryField', () => {
  it('should handle date range fields correctly', () => {
    const dateRangeField: SearchQueryField = {
      field: 'DOB',
      range: {
        startDate: '2020-01-01T00:00:00.000Z',
        endDate: '2020-12-31T23:59:59.999Z',
      },
    };

    const result = normalizeSearchQueryField(dateRangeField);

    expect(result).toEqual(dateRangeField);
  });

  it('should drop empty date range fields', () => {
    const emptyDateRangeField: SearchQueryField = {
      field: 'DOB',
      range: {
        startDate: null,
        endDate: null,
      },
    };

    const result = normalizeSearchQueryField(emptyDateRangeField);

    expect(result).toBeNull();
  });

  it('should handle date range fields with only start date', () => {
    const dateRangeField: SearchQueryField = {
      field: 'DOB',
      range: {
        startDate: '2020-01-01T00:00:00.000Z',
        endDate: null,
      },
    };

    const result = normalizeSearchQueryField(dateRangeField);

    expect(result).toEqual(dateRangeField);
  });

  it('should handle date range fields with only end date', () => {
    const dateRangeField: SearchQueryField = {
      field: 'DOB',
      range: {
        startDate: null,
        endDate: '2020-12-31T23:59:59.999Z',
      },
    };

    const result = normalizeSearchQueryField(dateRangeField);

    expect(result).toEqual(dateRangeField);
  });

  it('should handle date fields with values array', () => {
    const dateField: SearchQueryField = {
      field: 'DOB',
      values: ['2020-01-01T00:00:00.000Z', '2020-06-15T12:00:00.000Z'],
    };

    const result = normalizeSearchQueryField(dateField);

    expect(result).toEqual(dateField);
  });

  it('should trim and filter empty date values', () => {
    const dateField: SearchQueryField = {
      field: 'DOB',
      values: [
        '  2020-01-01T00:00:00.000Z  ',
        '',
        null,
        '2020-06-15T12:00:00.000Z',
      ],
    };

    const result = normalizeSearchQueryField(dateField);

    expect(result).toEqual({
      field: 'DOB',
      values: ['2020-01-01T00:00:00.000Z', '2020-06-15T12:00:00.000Z'],
    });
  });

  it('should handle number fields correctly', () => {
    const numberField: SearchQueryField = {
      field: 'houseNum',
      values: [123, null, 456],
    };

    const result = normalizeSearchQueryField(numberField);

    expect(result).toEqual({
      field: 'houseNum',
      values: [123, 456],
    });
  });

  it('should handle string fields correctly', () => {
    const stringField: SearchQueryField = {
      field: 'lastName',
      values: ['Smith', '', null, 'Jones'],
    };

    const result = normalizeSearchQueryField(stringField);

    expect(result).toEqual({
      field: 'lastName',
      values: ['SMITH', 'JONES'], // Names should be uppercased
    });
  });

  it('should handle computed boolean fields correctly', () => {
    const booleanField: SearchQueryField = {
      field: 'hasEmail',
      value: true,
    };

    const result = normalizeSearchQueryField(booleanField);

    expect(result).toEqual(booleanField);
  });

  it('should drop computed boolean fields with false value', () => {
    const booleanField: SearchQueryField = {
      field: 'hasEmail',
      value: null,
    };

    const result = normalizeSearchQueryField(booleanField);

    expect(result).toBeNull();
  });
});
