import {
  candidateSchema,
  vacancyAppointmentSchema,
  generateDesignatedPetitionDataSchema,
  defaultCustomPartyName,
} from '../../schemas/designatedPetition';

describe('candidateSchema', () => {
  it('accepts valid candidate', () => {
    const result = candidateSchema.safeParse({
      name: 'Jane Doe',
      office: 'Mayor',
      address: '123 Main St',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    expect(
      candidateSchema.safeParse({
        office: 'Mayor',
        address: '123 Main St',
      }).success,
    ).toBe(false);
  });

  it('rejects empty name', () => {
    expect(
      candidateSchema.safeParse({
        name: '',
        office: 'Mayor',
        address: '123 Main St',
      }).success,
    ).toBe(false);
  });

  it('rejects missing office', () => {
    expect(
      candidateSchema.safeParse({
        name: 'Jane',
        address: '123 Main St',
      }).success,
    ).toBe(false);
  });

  it('rejects empty office', () => {
    expect(
      candidateSchema.safeParse({
        name: 'Jane',
        office: '',
        address: '123 Main St',
      }).success,
    ).toBe(false);
  });

  it('rejects missing address', () => {
    expect(
      candidateSchema.safeParse({
        name: 'Jane',
        office: 'Mayor',
      }).success,
    ).toBe(false);
  });

  it('rejects empty address', () => {
    expect(
      candidateSchema.safeParse({
        name: 'Jane',
        office: 'Mayor',
        address: '',
      }).success,
    ).toBe(false);
  });
});

describe('vacancyAppointmentSchema', () => {
  it('accepts valid vacancy appointment', () => {
    const result = vacancyAppointmentSchema.safeParse({
      name: 'John Smith',
      address: '456 Oak Ave',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    expect(
      vacancyAppointmentSchema.safeParse({ address: '456 Oak Ave' }).success,
    ).toBe(false);
  });

  it('rejects empty name', () => {
    expect(
      vacancyAppointmentSchema.safeParse({ name: '', address: '456 Oak Ave' })
        .success,
    ).toBe(false);
  });

  it('rejects missing address', () => {
    expect(vacancyAppointmentSchema.safeParse({ name: 'John' }).success).toBe(
      false,
    );
  });

  it('rejects empty address', () => {
    expect(
      vacancyAppointmentSchema.safeParse({ name: 'John', address: '' })
        .success,
    ).toBe(false);
  });
});

describe('generateDesignatedPetitionDataSchema', () => {
  const validPayload = {
    candidates: [{ name: 'Jane', office: 'Mayor', address: '123 Main' }],
    vacancyAppointments: [{ name: 'John', address: '456 Oak' }],
    party: 'Democratic',
    electionDate: '2024-11-05',
    numPages: 5,
  };

  it('accepts valid payload', () => {
    expect(
      generateDesignatedPetitionDataSchema.safeParse(validPayload).success,
    ).toBe(true);
  });

  it('rejects defaultCustomPartyName as party', () => {
    expect(
      generateDesignatedPetitionDataSchema.safeParse({
        ...validPayload,
        party: defaultCustomPartyName,
      }).success,
    ).toBe(false);
  });

  it('rejects empty party', () => {
    expect(
      generateDesignatedPetitionDataSchema.safeParse({
        ...validPayload,
        party: '   ',
      }).success,
    ).toBe(false);
  });

  it('rejects numPages less than 1', () => {
    expect(
      generateDesignatedPetitionDataSchema.safeParse({
        ...validPayload,
        numPages: 0,
      }).success,
    ).toBe(false);
  });

  it('rejects numPages greater than 25', () => {
    expect(
      generateDesignatedPetitionDataSchema.safeParse({
        ...validPayload,
        numPages: 26,
      }).success,
    ).toBe(false);
  });

  it('accepts numPages at boundaries', () => {
    expect(
      generateDesignatedPetitionDataSchema.safeParse({
        ...validPayload,
        numPages: 1,
      }).success,
    ).toBe(true);
    expect(
      generateDesignatedPetitionDataSchema.safeParse({
        ...validPayload,
        numPages: 25,
      }).success,
    ).toBe(true);
  });

  it('rejects empty candidates array', () => {
    expect(
      generateDesignatedPetitionDataSchema.safeParse({
        ...validPayload,
        candidates: [],
      }).success,
    ).toBe(false);
  });

  it('rejects empty vacancyAppointments array', () => {
    expect(
      generateDesignatedPetitionDataSchema.safeParse({
        ...validPayload,
        vacancyAppointments: [],
      }).success,
    ).toBe(false);
  });

  it('rejects empty electionDate', () => {
    expect(
      generateDesignatedPetitionDataSchema.safeParse({
        ...validPayload,
        electionDate: '',
      }).success,
    ).toBe(false);
  });

  it('rejects whitespace-only electionDate', () => {
    expect(
      generateDesignatedPetitionDataSchema.safeParse({
        ...validPayload,
        electionDate: '   ',
      }).success,
    ).toBe(false);
  });

  it('accepts non-integer numPages (schema does not enforce integer)', () => {
    expect(
      generateDesignatedPetitionDataSchema.safeParse({
        ...validPayload,
        numPages: 5.5,
      }).success,
    ).toBe(true);
  });
});
