import {
  validateSearchQueryField,
  validateSearchQuery,
  safeValidateSearchQueryField,
  safeValidateSearchQuery,
  filterEmptyValues,
  filterEmptyFields,
} from '../searchQueryFieldValidators';
import { SearchQueryFieldError } from '../searchQueryErrors';
import type { SearchQueryField } from '../schemas/report';

describe('validateSearchQueryField', () => {
  it('accepts valid string field', () => {
    const field = { field: 'lastName' as const, values: ['Smith'] };
    const result = validateSearchQueryField(field);
    expect(result).toEqual(field);
  });

  it('accepts valid number field', () => {
    const field = { field: 'houseNum' as const, values: [123] };
    const result = validateSearchQueryField(field);
    expect(result).toEqual(field);
  });

  it('accepts valid date values field', () => {
    const field = {
      field: 'DOB' as const,
      values: ['2023-01-01T00:00:00.000Z'],
    };
    const result = validateSearchQueryField(field);
    expect(result).toEqual(field);
  });

  it('accepts valid date range field', () => {
    const field = {
      field: 'DOB' as const,
      range: {
        startDate: '2023-01-01T00:00:00.000Z',
        endDate: '2023-12-31T23:59:59.999Z',
      },
    };
    const result = validateSearchQueryField(field);
    expect(result).toEqual(field);
  });

  it('accepts valid computed boolean field', () => {
    const field = { field: 'hasEmail' as const, value: true };
    const result = validateSearchQueryField(field);
    expect(result).toEqual(field);
  });

  it('rejects computed boolean with value: false', () => {
    expect(() =>
      validateSearchQueryField({ field: 'hasEmail', value: false }),
    ).toThrow(SearchQueryFieldError);
  });

  it('throws SearchQueryFieldError for unknown field name', () => {
    expect(() =>
      validateSearchQueryField({ field: 'unknown', values: ['x'] }),
    ).toThrow(SearchQueryFieldError);
    expect(() =>
      validateSearchQueryField({ field: 'unknown', values: ['x'] }),
    ).toThrow(/Invalid search query field/);
  });

  it('throws SearchQueryFieldError for missing values', () => {
    expect(() => validateSearchQueryField({ field: 'lastName' })).toThrow(
      SearchQueryFieldError,
    );
  });

  it('throws SearchQueryFieldError for empty values array', () => {
    expect(() =>
      validateSearchQueryField({ field: 'lastName', values: [] }),
    ).toThrow(SearchQueryFieldError);
  });

  it('throws SearchQueryFieldError for wrong type in number field', () => {
    expect(() =>
      validateSearchQueryField({ field: 'houseNum', values: ['not-a-number'] }),
    ).toThrow(SearchQueryFieldError);
  });

  it('includes user-facing message and field in error', () => {
    try {
      validateSearchQueryField({ field: 'lastName', values: [] });
    } catch (e) {
      expect(e).toBeInstanceOf(SearchQueryFieldError);
      expect((e as SearchQueryFieldError).message).toMatch(
        /Invalid search query field/,
      );
      expect((e as SearchQueryFieldError).field).toEqual({
        field: 'lastName',
        values: [],
      });
    }
  });

  it('throws SearchQueryFieldError for non-object input', () => {
    expect(() => validateSearchQueryField(null)).toThrow(
      SearchQueryFieldError,
    );
    expect(() => validateSearchQueryField('string')).toThrow(
      SearchQueryFieldError,
    );
  });

  it('throws SearchQueryFieldError for empty object', () => {
    expect(() => validateSearchQueryField({})).toThrow(SearchQueryFieldError);
  });
});

describe('validateSearchQuery', () => {
  it('returns valid result for mixed valid fields', () => {
    const query: unknown[] = [
      { field: 'lastName', values: ['Smith'] },
      { field: 'houseNum', values: [123] },
      { field: 'hasEmail', value: true },
    ];
    const result = validateSearchQuery(query);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.data).toHaveLength(3);
  });

  it('collects errors for invalid fields and keeps valid ones', () => {
    const query: unknown[] = [
      { field: 'lastName', values: ['Smith'] },
      { field: 'unknown', values: ['x'] },
      { field: 'houseNum', values: [456] },
    ];
    const result = validateSearchQuery(query);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/Field 1:/);
    expect(result.data).toHaveLength(2);
  });

  it('returns valid result for empty array', () => {
    const result = validateSearchQuery([]);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.data).toEqual([]);
  });

  it('reports all errors when all fields are invalid', () => {
    const query: unknown[] = [
      { field: 'unknown1', values: ['x'] },
      { field: 'unknown2', values: ['y'] },
    ];
    const result = validateSearchQuery(query);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toMatch(/Field 0:/);
    expect(result.errors[1]).toMatch(/Field 1:/);
    expect(result.data).toEqual([]);
  });
});

describe('safeValidateSearchQueryField', () => {
  it('returns success with data for valid field', () => {
    const field = { field: 'lastName' as const, values: ['Smith'] };
    const result = safeValidateSearchQueryField(field);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(field);
    }
  });

  it('returns failure with error for invalid field without throwing', () => {
    const result = safeValidateSearchQueryField({
      field: 'unknown',
      values: ['x'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    }
  });
});

describe('safeValidateSearchQuery', () => {
  it('returns success with data for all valid fields', () => {
    const query = [
      { field: 'lastName', values: ['Smith'] },
      { field: 'hasEmail', value: true },
    ];
    const result = safeValidateSearchQuery(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it('aggregates multiple errors in error string', () => {
    const query = [
      { field: 'unknown', values: ['x'] },
      { field: 'alsoUnknown', values: ['y'] },
    ];
    const result = safeValidateSearchQuery(query);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain(';');
    }
  });

  it('returns success for single valid field', () => {
    const result = safeValidateSearchQuery([
      { field: 'lastName', values: ['Smith'] },
    ]);
    expect(result.success).toBe(true);
  });

  it('returns error without semicolon for single invalid field', () => {
    const result = safeValidateSearchQuery([
      { field: 'unknown', values: ['x'] },
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).not.toContain(';');
    }
  });
});

describe('filterEmptyValues', () => {
  it('filters null, undefined, empty string from values array', () => {
    const field = {
      field: 'lastName',
      values: ['Smith', null, undefined, '', 'Jones'],
    } as SearchQueryField;
    const result = filterEmptyValues(field);
    expect(result).toEqual({
      field: 'lastName',
      values: ['Smith', 'Jones'],
    });
  });

  it('returns null when all values are empty', () => {
    const field = {
      field: 'lastName',
      values: [null, undefined, ''],
    } as SearchQueryField;
    const result = filterEmptyValues(field);
    expect(result).toBeNull();
  });

  it('returns null for computed boolean with null value', () => {
    const field: SearchQueryField = { field: 'hasEmail', value: null };
    const result = filterEmptyValues(field);
    expect(result).toBeNull();
  });

  it('returns null for computed boolean with undefined value', () => {
    const field = {
      field: 'hasEmail',
      value: undefined,
    } as unknown as SearchQueryField;
    const result = filterEmptyValues(field);
    expect(result).toBeNull();
  });

  it('returns computed boolean unchanged when value is true', () => {
    const field: SearchQueryField = { field: 'hasEmail', value: true };
    const result = filterEmptyValues(field);
    expect(result).toEqual(field);
  });

  it('returns date range field unchanged', () => {
    const field: SearchQueryField = {
      field: 'DOB',
      range: {
        startDate: '2023-01-01T00:00:00.000Z',
        endDate: null,
      },
    };
    const result = filterEmptyValues(field);
    expect(result).toEqual(field);
  });

  it('filters empty values from number fields', () => {
    const field = {
      field: 'houseNum',
      values: [null, 42, undefined],
    } as SearchQueryField;
    const result = filterEmptyValues(field);
    expect(result).toEqual({ field: 'houseNum', values: [42] });
  });
});

describe('filterEmptyFields', () => {
  it('removes fields that become null after filterEmptyValues', () => {
    const query: SearchQueryField[] = [
      { field: 'lastName', values: ['Smith'] },
      { field: 'hasEmail', value: null },
      { field: 'firstName', values: [''] },
    ];
    const result = filterEmptyFields(query);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ field: 'lastName', values: ['Smith'] });
  });

  it('returns empty array when all fields are empty', () => {
    const query: SearchQueryField[] = [
      { field: 'lastName', values: [] },
      { field: 'hasEmail', value: null },
    ];
    const result = filterEmptyFields(query);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(filterEmptyFields([])).toEqual([]);
  });

  it('returns all fields when none are empty', () => {
    const query: SearchQueryField[] = [
      { field: 'lastName', values: ['Smith'] },
      { field: 'hasEmail', value: true },
      {
        field: 'DOB',
        range: {
          startDate: '2023-01-01T00:00:00.000Z',
          endDate: null,
        },
      },
    ];
    const result = filterEmptyFields(query);
    expect(result).toHaveLength(3);
  });
});
