import { committeeTermFieldsSchema } from '../../schemas/committeeTerm';

const validPayload = {
  label: '2026–2028',
  startDate: '2026-01-01',
  endDate: '2028-12-31',
};

describe('committeeTermFieldsSchema', () => {
  it('accepts a valid label and date range', () => {
    expect(committeeTermFieldsSchema.parse(validPayload)).toEqual(validPayload);
  });

  it('trims the label', () => {
    expect(
      committeeTermFieldsSchema.parse({
        ...validPayload,
        label: '  2026–2028  ',
      }).label,
    ).toBe('2026–2028');
  });

  it('rejects an empty label', () => {
    expect(
      committeeTermFieldsSchema.safeParse({
        ...validPayload,
        label: '   ',
      }).success,
    ).toBe(false);
  });

  it('rejects an unparseable start date', () => {
    expect(
      committeeTermFieldsSchema.safeParse({
        ...validPayload,
        startDate: 'not-a-date',
      }).success,
    ).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(
      committeeTermFieldsSchema.safeParse({
        label: '2026–2028',
        startDate: '2026-01-01',
      }).success,
    ).toBe(false);
  });
});
