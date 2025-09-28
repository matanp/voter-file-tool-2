import { z } from 'zod';
import { searchQueryFieldSchema } from '../schemas/report';

describe('searchQueryFieldSchema - DateRange', () => {
  it('validates date field with range', () => {
    const validField = {
      field: 'DOB',
      range: {
        startDate: '2023-01-01T00:00:00.000Z',
        endDate: '2023-12-31T23:59:59.999Z',
      },
    };

    const result = searchQueryFieldSchema.parse(validField);

    expect(result).toEqual(validField);
  });

  it('validates date field with range and null dates', () => {
    const validField = {
      field: 'DOB',
      range: {
        startDate: '2023-01-01T00:00:00.000Z',
        endDate: null,
      },
    };

    const result = searchQueryFieldSchema.parse(validField);

    expect(result).toEqual(validField);
  });

  it('validates date field with both values and range (values take precedence)', () => {
    const fieldWithBoth = {
      field: 'DOB',
      values: ['2023-01-01T00:00:00.000Z'],
      range: {
        startDate: '2023-01-01T00:00:00.000Z',
        endDate: '2023-12-31T23:59:59.999Z',
      },
    };

    const result = searchQueryFieldSchema.parse(fieldWithBoth);

    expect(result).toEqual(fieldWithBoth);
  });

  it('rejects date field with neither values nor range', () => {
    const invalidField = {
      field: 'DOB',
    };

    expect(() => searchQueryFieldSchema.parse(invalidField)).toThrow();
  });

  it('rejects date field with empty range', () => {
    const invalidField = {
      field: 'DOB',
      range: {
        startDate: null,
        endDate: null,
      },
    };

    expect(() => searchQueryFieldSchema.parse(invalidField)).toThrow();
  });

  it('rejects date field with invalid datetime strings', () => {
    const invalidField = {
      field: 'DOB',
      range: {
        startDate: 'invalid-date',
        endDate: '2023-12-31T23:59:59.999Z',
      },
    };

    expect(() => searchQueryFieldSchema.parse(invalidField)).toThrow();
  });

  it('validates all date fields with range', () => {
    const dateFields = ['DOB', 'lastUpdate', 'originalRegDate'];

    dateFields.forEach((field) => {
      const validField = {
        field,
        range: {
          startDate: '2023-01-01T00:00:00.000Z',
          endDate: '2023-12-31T23:59:59.999Z',
        },
      };

      const result = searchQueryFieldSchema.parse(validField);
      expect(result.field).toBe(field);
    });
  });

  it('validates range with only startDate', () => {
    const validField = {
      field: 'DOB',
      range: {
        startDate: '2023-01-01T00:00:00.000Z',
        endDate: null,
      },
    };

    const result = searchQueryFieldSchema.parse(validField);
    expect(result.range?.startDate).toBe('2023-01-01T00:00:00.000Z');
    expect(result.range?.endDate).toBeNull();
  });

  it('validates range with only endDate', () => {
    const validField = {
      field: 'DOB',
      range: {
        startDate: null,
        endDate: '2023-12-31T23:59:59.999Z',
      },
    };

    const result = searchQueryFieldSchema.parse(validField);
    expect(result.range?.startDate).toBeNull();
    expect(result.range?.endDate).toBe('2023-12-31T23:59:59.999Z');
  });
});
