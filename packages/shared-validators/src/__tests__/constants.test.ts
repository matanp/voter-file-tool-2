import {
  NUMBER_FIELDS,
  STRING_FIELDS,
  DATE_FIELDS,
  COMPUTED_BOOLEAN_FIELDS,
  SEARCHABLE_FIELD_VALUES,
  LEG_DISTRICT_SENTINEL,
  MAX_RECORDS_FOR_EXPORT,
  ADMIN_CONTACT_INFO,
  searchableFieldEnum,
} from '../constants';

describe('field array disjointness', () => {
  it('NUMBER_FIELDS, STRING_FIELDS, DATE_FIELDS, and COMPUTED_BOOLEAN_FIELDS have no overlapping names', () => {
    const allFields = [
      ...NUMBER_FIELDS,
      ...STRING_FIELDS,
      ...DATE_FIELDS,
      ...COMPUTED_BOOLEAN_FIELDS,
    ];
    const unique = new Set(allFields);
    expect(unique.size).toBe(allFields.length);
  });
});

describe('SEARCHABLE_FIELD_VALUES', () => {
  it('contains all fields from the four arrays', () => {
    const expected = [
      ...NUMBER_FIELDS,
      ...COMPUTED_BOOLEAN_FIELDS,
      ...DATE_FIELDS,
      ...STRING_FIELDS,
    ];
    expect(SEARCHABLE_FIELD_VALUES).toEqual(expected);
  });
});

describe('LEG_DISTRICT_SENTINEL', () => {
  it('equals -1', () => {
    expect(LEG_DISTRICT_SENTINEL).toBe(-1);
  });
});

describe('MAX_RECORDS_FOR_EXPORT', () => {
  it('is a positive number', () => {
    expect(MAX_RECORDS_FOR_EXPORT).toBeGreaterThan(0);
  });
});

describe('ADMIN_CONTACT_INFO', () => {
  it('contains the max records value', () => {
    expect(ADMIN_CONTACT_INFO).toContain(
      MAX_RECORDS_FOR_EXPORT.toLocaleString(),
    );
  });
});

describe('searchableFieldEnum', () => {
  it('accepts valid field names', () => {
    SEARCHABLE_FIELD_VALUES.forEach((name) => {
      expect(searchableFieldEnum.safeParse(name).success).toBe(true);
    });
  });

  it('rejects invalid field names', () => {
    expect(searchableFieldEnum.safeParse('unknown').success).toBe(false);
    expect(searchableFieldEnum.safeParse('').success).toBe(false);
    expect(searchableFieldEnum.safeParse(123).success).toBe(false);
  });
});
