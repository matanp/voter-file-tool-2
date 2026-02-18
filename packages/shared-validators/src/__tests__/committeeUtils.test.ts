import { normalizeSentinelValues, toDbSentinelValue } from '../committeeUtils';
import { LEG_DISTRICT_SENTINEL } from '../constants';

describe('normalizeSentinelValues', () => {
  it('returns undefined for legDistrict when it equals LEG_DISTRICT_SENTINEL', () => {
    const result = normalizeSentinelValues(1, LEG_DISTRICT_SENTINEL);
    expect(result.normalizedElectionDistrict).toBe(1);
    expect(result.normalizedLegDistrict).toBeUndefined();
  });

  it('returns undefined for string "-1" (sentinel)', () => {
    const result = normalizeSentinelValues(1, '-1');
    expect(result.normalizedLegDistrict).toBeUndefined();
  });

  it('returns undefined for trimmed empty string', () => {
    const result = normalizeSentinelValues(1, '   ');
    expect(result.normalizedLegDistrict).toBeUndefined();
  });

  it('returns number as string for valid number', () => {
    const result = normalizeSentinelValues(1, 5);
    expect(result.normalizedLegDistrict).toBe('5');
  });

  it('returns trimmed string for valid string', () => {
    const result = normalizeSentinelValues(1, '  District 5  ');
    expect(result.normalizedLegDistrict).toBe('District 5');
  });

  it('returns undefined when legDistrict is undefined', () => {
    const result = normalizeSentinelValues(1, undefined);
    expect(result.normalizedLegDistrict).toBeUndefined();
  });

  it('returns undefined for whitespace-padded sentinel string', () => {
    const result = normalizeSentinelValues(1, '  -1  ');
    expect(result.normalizedLegDistrict).toBeUndefined();
  });

  it('always passes through electionDistrict unchanged', () => {
    expect(normalizeSentinelValues(42, 5).normalizedElectionDistrict).toBe(42);
    expect(
      normalizeSentinelValues(42, undefined).normalizedElectionDistrict,
    ).toBe(42);
    expect(
      normalizeSentinelValues(42, LEG_DISTRICT_SENTINEL)
        .normalizedElectionDistrict,
    ).toBe(42);
  });
});

describe('toDbSentinelValue', () => {
  it('returns LEG_DISTRICT_SENTINEL for undefined', () => {
    expect(toDbSentinelValue(undefined)).toBe(LEG_DISTRICT_SENTINEL);
  });

  it('returns same value for valid integer', () => {
    expect(toDbSentinelValue(5)).toBe(5);
  });

  it('returns parsed integer for valid string', () => {
    expect(toDbSentinelValue('10')).toBe(10);
  });

  it('returns LEG_DISTRICT_SENTINEL for empty string', () => {
    expect(toDbSentinelValue('')).toBe(LEG_DISTRICT_SENTINEL);
  });

  it('throws for non-integer string', () => {
    expect(() => toDbSentinelValue('abc')).toThrow(/Invalid legDistrict/);
  });

  it('throws for non-integer number', () => {
    expect(() => toDbSentinelValue(3.14)).toThrow(/Invalid legDistrict/);
  });

  it('returns LEG_DISTRICT_SENTINEL for whitespace-only string', () => {
    expect(toDbSentinelValue('   ')).toBe(LEG_DISTRICT_SENTINEL);
  });

  it('throws for string float value', () => {
    expect(() => toDbSentinelValue('3.14')).toThrow(/Invalid legDistrict/);
  });
});

describe('round-trip', () => {
  it('normalize then toDb for undefined yields sentinel, normalize yields undefined', () => {
    const db = toDbSentinelValue(undefined);
    expect(db).toBe(LEG_DISTRICT_SENTINEL);
    const normalized = normalizeSentinelValues(1, db);
    expect(normalized.normalizedLegDistrict).toBeUndefined();
  });

  it('normalize then toDb for valid value preserves value', () => {
    const normalized = normalizeSentinelValues(1, 5);
    expect(normalized.normalizedLegDistrict).toBe('5');
    const db = toDbSentinelValue(normalized.normalizedLegDistrict);
    expect(db).toBe(5);
  });
});
