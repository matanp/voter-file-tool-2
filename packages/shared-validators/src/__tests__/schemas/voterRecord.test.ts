import {
  voterRecordSchema,
  partialVoterRecordSchema,
} from '../../schemas/voterRecord';

function makeValidVoterRecord() {
  return {
    VRCNUM: '123',
    committeeId: null,
    addressForCommittee: null,
    latestRecordEntryYear: 2024,
    latestRecordEntryNumber: 1,
    lastName: null,
    firstName: null,
    middleInitial: null,
    suffixName: null,
    houseNum: null,
    street: null,
    apartment: null,
    halfAddress: null,
    resAddrLine2: null,
    resAddrLine3: null,
    city: null,
    state: null,
    zipCode: null,
    zipSuffix: null,
    telephone: null,
    email: null,
    mailingAddress1: null,
    mailingAddress2: null,
    mailingAddress3: null,
    mailingAddress4: null,
    mailingCity: null,
    mailingState: null,
    mailingZip: null,
    mailingZipSuffix: null,
    party: null,
    gender: null,
    DOB: null,
    L_T: null,
    electionDistrict: null,
    countyLegDistrict: null,
    stateAssmblyDistrict: null,
    stateSenateDistrict: null,
    congressionalDistrict: null,
    CC_WD_Village: null,
    townCode: null,
    lastUpdate: null,
    originalRegDate: null,
    statevid: null,
    hasDiscrepancy: null,
  };
}

describe('voterRecordSchema', () => {
  it('accepts full valid record', () => {
    const result = voterRecordSchema.safeParse(makeValidVoterRecord());
    expect(result.success).toBe(true);
  });

  it('accepts record with non-null values', () => {
    const record = {
      ...makeValidVoterRecord(),
      committeeId: 42,
      electionDistrict: 5,
      houseNum: 123,
      hasDiscrepancy: true,
      firstName: 'John',
      lastName: 'Doe',
    };
    const result = voterRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
  });

  it('rejects missing required VRCNUM', () => {
    const { VRCNUM: _, ...rest } = makeValidVoterRecord();
    expect(voterRecordSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing latestRecordEntryYear', () => {
    const record = {
      ...makeValidVoterRecord(),
      latestRecordEntryYear: undefined,
    };
    expect(voterRecordSchema.safeParse(record).success).toBe(false);
  });

  it('rejects missing latestRecordEntryNumber', () => {
    const record = {
      ...makeValidVoterRecord(),
      latestRecordEntryNumber: undefined,
    };
    expect(voterRecordSchema.safeParse(record).success).toBe(false);
  });

  it('rejects wrong type for VRCNUM', () => {
    const record = { ...makeValidVoterRecord(), VRCNUM: 123 };
    expect(voterRecordSchema.safeParse(record).success).toBe(false);
  });

  it('rejects string for numeric fields', () => {
    expect(
      voterRecordSchema.safeParse({
        ...makeValidVoterRecord(),
        houseNum: 'not-a-number',
      }).success,
    ).toBe(false);

    expect(
      voterRecordSchema.safeParse({
        ...makeValidVoterRecord(),
        electionDistrict: 'not-a-number',
      }).success,
    ).toBe(false);

    expect(
      voterRecordSchema.safeParse({
        ...makeValidVoterRecord(),
        latestRecordEntryYear: '2024',
      }).success,
    ).toBe(false);
  });

  it('rejects number for string fields', () => {
    expect(
      voterRecordSchema.safeParse({
        ...makeValidVoterRecord(),
        lastName: 123,
      }).success,
    ).toBe(false);
  });

  it('accepts hasDiscrepancy as true, false, and null', () => {
    expect(
      voterRecordSchema.safeParse({
        ...makeValidVoterRecord(),
        hasDiscrepancy: true,
      }).success,
    ).toBe(true);

    expect(
      voterRecordSchema.safeParse({
        ...makeValidVoterRecord(),
        hasDiscrepancy: false,
      }).success,
    ).toBe(true);

    expect(
      voterRecordSchema.safeParse({
        ...makeValidVoterRecord(),
        hasDiscrepancy: null,
      }).success,
    ).toBe(true);
  });

  it('rejects non-boolean for hasDiscrepancy', () => {
    expect(
      voterRecordSchema.safeParse({
        ...makeValidVoterRecord(),
        hasDiscrepancy: 'yes',
      }).success,
    ).toBe(false);
  });
});

describe('partialVoterRecordSchema', () => {
  it('accepts empty object', () => {
    expect(partialVoterRecordSchema.safeParse({}).success).toBe(true);
  });

  it('accepts partial record with only some fields', () => {
    expect(
      partialVoterRecordSchema.safeParse({
        VRCNUM: '123',
        firstName: 'John',
      }).success,
    ).toBe(true);
  });

  it('rejects wrong type even in partial mode', () => {
    expect(
      partialVoterRecordSchema.safeParse({ houseNum: 'not-a-number' }).success,
    ).toBe(false);

    expect(
      partialVoterRecordSchema.safeParse({ hasDiscrepancy: 'yes' }).success,
    ).toBe(false);
  });
});
