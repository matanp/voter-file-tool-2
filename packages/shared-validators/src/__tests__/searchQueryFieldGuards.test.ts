import {
  isNumberSearchField,
  isComputedBooleanSearchField,
  isDateValuesSearchField,
  isDateRangeSearchField,
  isStringSearchField,
  isValuesSearchField,
  isSingleValueSearchField,
  isDateSearchField,
  isNumberFieldName,
  isDateFieldName,
  isStringFieldName,
  isComputedBooleanFieldName,
  isNameFieldName,
} from '../searchQueryFieldGuards';
import {
  NUMBER_FIELDS,
  STRING_FIELDS,
  DATE_FIELDS,
  COMPUTED_BOOLEAN_FIELDS,
} from '../constants';
import type { SearchQueryField } from '../schemas/report';

describe('isNumberSearchField', () => {
  it('returns true for number field', () => {
    const field: SearchQueryField = { field: 'houseNum', values: [123] };
    expect(isNumberSearchField(field)).toBe(true);
    expect(
      isNumberSearchField({ field: 'electionDistrict', values: [5] }),
    ).toBe(true);
  });

  it('returns false for string field', () => {
    const field: SearchQueryField = { field: 'lastName', values: ['Smith'] };
    expect(isNumberSearchField(field)).toBe(false);
  });

  it('returns false for computed boolean field', () => {
    const field: SearchQueryField = { field: 'hasEmail', value: true };
    expect(isNumberSearchField(field)).toBe(false);
  });

  it('returns false for date range field', () => {
    const field: SearchQueryField = {
      field: 'DOB',
      range: { startDate: '2023-01-01', endDate: null },
    };
    expect(isNumberSearchField(field)).toBe(false);
  });

  it('returns false for malformed object without values', () => {
    const field = { field: 'houseNum' } as unknown;
    expect(isNumberSearchField(field as SearchQueryField)).toBe(false);
  });

  it('returns false for date values field', () => {
    const field: SearchQueryField = {
      field: 'DOB',
      values: ['2023-01-01T00:00:00.000Z'],
    };
    expect(isNumberSearchField(field)).toBe(false);
  });
});

describe('isComputedBooleanSearchField', () => {
  it('returns true for computed boolean field', () => {
    expect(
      isComputedBooleanSearchField({ field: 'hasEmail', value: true }),
    ).toBe(true);
    expect(
      isComputedBooleanSearchField({ field: 'hasPhone', value: true }),
    ).toBe(true);
  });

  it('returns true for hasInvalidEmail', () => {
    expect(
      isComputedBooleanSearchField({
        field: 'hasInvalidEmail',
        value: true,
      }),
    ).toBe(true);
  });

  it('returns true when value is null', () => {
    expect(
      isComputedBooleanSearchField({ field: 'hasEmail', value: null }),
    ).toBe(true);
  });

  it('returns false for number field', () => {
    expect(
      isComputedBooleanSearchField({
        field: 'houseNum',
        values: [1],
      } as SearchQueryField),
    ).toBe(false);
  });

  it('returns false for string field', () => {
    expect(
      isComputedBooleanSearchField({
        field: 'lastName',
        values: ['x'],
      } as SearchQueryField),
    ).toBe(false);
  });
});

describe('isDateValuesSearchField', () => {
  it('returns true for date field with values', () => {
    const field: SearchQueryField = {
      field: 'DOB',
      values: ['2023-01-01T00:00:00.000Z'],
    };
    expect(isDateValuesSearchField(field)).toBe(true);
  });

  it('returns true for all date fields', () => {
    DATE_FIELDS.forEach((name) => {
      expect(
        isDateValuesSearchField({
          field: name,
          values: ['2023-01-01T00:00:00.000Z'],
        } as SearchQueryField),
      ).toBe(true);
    });
  });

  it('returns false for date range field', () => {
    const field: SearchQueryField = {
      field: 'DOB',
      range: { startDate: '2023-01-01', endDate: null },
    };
    expect(isDateValuesSearchField(field)).toBe(false);
  });

  it('returns false for string field', () => {
    expect(
      isDateValuesSearchField({
        field: 'lastName',
        values: ['x'],
      } as SearchQueryField),
    ).toBe(false);
  });
});

describe('isDateRangeSearchField', () => {
  it('returns true for date field with range', () => {
    const field: SearchQueryField = {
      field: 'DOB',
      range: { startDate: '2023-01-01', endDate: '2023-12-31' },
    };
    expect(isDateRangeSearchField(field)).toBe(true);
  });

  it('returns true for all date fields with range', () => {
    DATE_FIELDS.forEach((name) => {
      expect(
        isDateRangeSearchField({
          field: name,
          range: { startDate: '2023-01-01', endDate: null },
        } as SearchQueryField),
      ).toBe(true);
    });
  });

  it('returns false for date field with values', () => {
    const field: SearchQueryField = {
      field: 'DOB',
      values: ['2023-01-01'],
    };
    expect(isDateRangeSearchField(field)).toBe(false);
  });

  it('returns false for number field', () => {
    expect(
      isDateRangeSearchField({
        field: 'houseNum',
        values: [1],
      } as SearchQueryField),
    ).toBe(false);
  });
});

describe('isStringSearchField', () => {
  it('returns true for string field', () => {
    expect(isStringSearchField({ field: 'lastName', values: ['Smith'] })).toBe(
      true,
    );
    expect(isStringSearchField({ field: 'firstName', values: ['John'] })).toBe(
      true,
    );
  });

  it('returns true for non-name string fields', () => {
    expect(
      isStringSearchField({ field: 'email', values: ['test@example.com'] }),
    ).toBe(true);
    expect(isStringSearchField({ field: 'party', values: ['DEM'] })).toBe(
      true,
    );
  });

  it('returns false for number field', () => {
    expect(
      isStringSearchField({
        field: 'houseNum',
        values: [1],
      } as SearchQueryField),
    ).toBe(false);
  });

  it('returns false for computed boolean field', () => {
    expect(
      isStringSearchField({
        field: 'hasEmail',
        value: true,
      } as SearchQueryField),
    ).toBe(false);
  });
});

describe('isValuesSearchField', () => {
  it('returns true for field with values array', () => {
    expect(
      isValuesSearchField({
        field: 'lastName',
        values: ['x'],
      } as SearchQueryField),
    ).toBe(true);
    expect(
      isValuesSearchField({
        field: 'houseNum',
        values: [1],
      } as SearchQueryField),
    ).toBe(true);
  });

  it('returns false for computed boolean (single value)', () => {
    expect(
      isValuesSearchField({
        field: 'hasEmail',
        value: true,
      } as SearchQueryField),
    ).toBe(false);
  });

  it('returns false for date range field', () => {
    expect(
      isValuesSearchField({
        field: 'DOB',
        range: { startDate: '2023-01-01', endDate: null },
      } as SearchQueryField),
    ).toBe(false);
  });
});

describe('isSingleValueSearchField', () => {
  it('returns true for computed boolean field', () => {
    expect(isSingleValueSearchField({ field: 'hasEmail', value: true })).toBe(
      true,
    );
  });

  it('returns true when value is null', () => {
    expect(
      isSingleValueSearchField({ field: 'hasEmail', value: null }),
    ).toBe(true);
  });

  it('returns false for field with values', () => {
    expect(
      isSingleValueSearchField({
        field: 'lastName',
        values: ['x'],
      } as SearchQueryField),
    ).toBe(false);
  });
});

describe('isDateSearchField', () => {
  it('returns true for date values field', () => {
    expect(
      isDateSearchField({
        field: 'DOB',
        values: ['2023-01-01'],
      } as SearchQueryField),
    ).toBe(true);
  });

  it('returns true for date range field', () => {
    expect(
      isDateSearchField({
        field: 'DOB',
        range: { startDate: '2023-01-01', endDate: null },
      } as SearchQueryField),
    ).toBe(true);
  });

  it('returns true for all date field names', () => {
    DATE_FIELDS.forEach((name) => {
      expect(
        isDateSearchField({
          field: name,
          values: ['2023-01-01T00:00:00.000Z'],
        } as SearchQueryField),
      ).toBe(true);
    });
  });

  it('returns false for string field', () => {
    expect(
      isDateSearchField({
        field: 'lastName',
        values: ['x'],
      } as SearchQueryField),
    ).toBe(false);
  });
});

describe('isNumberFieldName', () => {
  it('returns true for valid number field names', () => {
    NUMBER_FIELDS.forEach((name) => {
      expect(isNumberFieldName(name)).toBe(true);
    });
  });

  it('returns false for invalid names', () => {
    expect(isNumberFieldName('')).toBe(false);
    expect(isNumberFieldName('unknown')).toBe(false);
    expect(isNumberFieldName('lastName')).toBe(false);
  });
});

describe('isDateFieldName', () => {
  it('returns true for valid date field names', () => {
    DATE_FIELDS.forEach((name) => {
      expect(isDateFieldName(name)).toBe(true);
    });
  });

  it('returns false for invalid names', () => {
    expect(isDateFieldName('')).toBe(false);
    expect(isDateFieldName('unknown')).toBe(false);
  });
});

describe('isStringFieldName', () => {
  it('returns true for valid string field names', () => {
    expect(isStringFieldName('lastName')).toBe(true);
    expect(isStringFieldName('firstName')).toBe(true);
  });

  it('returns false for invalid names', () => {
    expect(isStringFieldName('')).toBe(false);
    expect(isStringFieldName('unknown')).toBe(false);
    expect(isStringFieldName('houseNum')).toBe(false);
  });
});

describe('isComputedBooleanFieldName', () => {
  it('returns true for valid computed boolean names', () => {
    COMPUTED_BOOLEAN_FIELDS.forEach((name) => {
      expect(isComputedBooleanFieldName(name)).toBe(true);
    });
  });

  it('returns false for invalid names', () => {
    expect(isComputedBooleanFieldName('')).toBe(false);
    expect(isComputedBooleanFieldName('lastName')).toBe(false);
  });
});

describe('isNameFieldName', () => {
  it('returns true for firstName and lastName', () => {
    expect(isNameFieldName('firstName')).toBe(true);
    expect(isNameFieldName('lastName')).toBe(true);
  });

  it('returns false for other string fields', () => {
    expect(isNameFieldName('email')).toBe(false);
    expect(isNameFieldName('')).toBe(false);
    expect(isNameFieldName('party')).toBe(false);
  });
});
