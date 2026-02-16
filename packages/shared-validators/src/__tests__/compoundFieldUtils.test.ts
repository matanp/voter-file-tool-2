import {
  createCompoundNameField,
  createCompoundAddressField,
  convertPrismaVoterRecordToAPI,
  applyCompoundFields,
  determineColumnsToInclude,
  extractFieldValue,
  sanitizeVoterRecord,
  mapVoterRecordToMemberWithFields,
  mapVoterRecordAPIToMemberWithFields,
} from '../compoundFieldUtils';
import type { VoterRecord as PrismaVoterRecord } from '@voter-file-tool/shared-prisma';

function makePrismaRecord(
  overrides: Partial<PrismaVoterRecord> = {},
): PrismaVoterRecord {
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
    ...overrides,
  } as PrismaVoterRecord;
}

describe('createCompoundNameField', () => {
  it('handles first name only', () => {
    expect(createCompoundNameField({ firstName: 'John' })).toBe('John');
  });

  it('handles first and last name', () => {
    expect(
      createCompoundNameField({ firstName: 'John', lastName: 'Smith' }),
    ).toBe('John Smith');
  });

  it('handles first, middle, last, and suffix', () => {
    expect(
      createCompoundNameField({
        firstName: 'John',
        middleInitial: 'Q',
        lastName: 'Smith',
        suffixName: 'Jr',
      }),
    ).toBe('John Q Smith Jr');
  });

  it('returns empty string when all empty', () => {
    expect(createCompoundNameField({})).toBe('');
  });

  it('handles last name only', () => {
    expect(createCompoundNameField({ lastName: 'Smith' })).toBe('Smith');
  });

  it('handles first name and middle initial only', () => {
    expect(
      createCompoundNameField({ firstName: 'John', middleInitial: 'Q' }),
    ).toBe('John Q');
  });
});

describe('createCompoundAddressField', () => {
  it('formats full address', () => {
    const record = {
      houseNum: 123,
      street: 'Main St',
      apartment: '4B',
      city: 'Albany',
      state: 'NY',
      zipCode: '12201',
      zipSuffix: '1234',
    };
    expect(createCompoundAddressField(record)).toBe(
      '123 Main St Apt 4B, Albany, NY 12201-1234',
    );
  });

  it('formats partial address (street and city only)', () => {
    const record = { street: 'Oak Ave', city: 'Buffalo', state: 'NY' };
    expect(createCompoundAddressField(record)).toBe('Oak Ave, Buffalo, NY');
  });

  it('returns empty string when no components', () => {
    expect(createCompoundAddressField({})).toBe('');
  });

  it('formats apartment as Apt X', () => {
    const record = { apartment: '12' };
    expect(createCompoundAddressField(record)).toBe('Apt 12');
  });

  it('includes resAddrLine2 and resAddrLine3', () => {
    const record = {
      street: 'Main St',
      resAddrLine2: 'Suite 200',
      resAddrLine3: 'Floor 3',
      city: 'Albany',
      state: 'NY',
    };
    expect(createCompoundAddressField(record)).toBe(
      'Main St Suite 200 Floor 3, Albany, NY',
    );
  });

  it('formats zipCode without zipSuffix', () => {
    const record = { city: 'Albany', state: 'NY', zipCode: '12201' };
    expect(createCompoundAddressField(record)).toBe('Albany, NY 12201');
  });

  it('ignores zipSuffix when zipCode is absent', () => {
    const record = { city: 'Albany', state: 'NY', zipSuffix: '1234' };
    expect(createCompoundAddressField(record)).toBe('Albany, NY');
  });

  it('handles city only without state', () => {
    const record = { city: 'Albany' };
    expect(createCompoundAddressField(record)).toBe('Albany');
  });
});

describe('convertPrismaVoterRecordToAPI', () => {
  it('converts Date fields to ISO strings', () => {
    const dob = new Date('1990-05-15T00:00:00.000Z');
    const lastUpdate = new Date('2024-01-01T12:00:00.000Z');
    const record = makePrismaRecord({
      DOB: dob,
      lastUpdate,
      originalRegDate: null,
    });
    const result = convertPrismaVoterRecordToAPI(record);
    expect(result.DOB).toBe('1990-05-15T00:00:00.000Z');
    expect(result.lastUpdate).toBe('2024-01-01T12:00:00.000Z');
    expect(result.originalRegDate).toBeNull();
  });

  it('preserves null dates', () => {
    const record = makePrismaRecord({
      DOB: null,
      lastUpdate: null,
      originalRegDate: null,
    });
    const result = convertPrismaVoterRecordToAPI(record);
    expect(result.DOB).toBeNull();
    expect(result.lastUpdate).toBeNull();
    expect(result.originalRegDate).toBeNull();
  });

  it('converts all three date fields when present', () => {
    const record = makePrismaRecord({
      DOB: new Date('1990-01-01T00:00:00.000Z'),
      lastUpdate: new Date('2024-01-01T00:00:00.000Z'),
      originalRegDate: new Date('2020-06-15T00:00:00.000Z'),
    });
    const result = convertPrismaVoterRecordToAPI(record);
    expect(result.DOB).toBe('1990-01-01T00:00:00.000Z');
    expect(result.lastUpdate).toBe('2024-01-01T00:00:00.000Z');
    expect(result.originalRegDate).toBe('2020-06-15T00:00:00.000Z');
  });
});

describe('applyCompoundFields', () => {
  it('applies name and address when config is default', () => {
    const record = {
      firstName: 'John',
      lastName: 'Smith',
      street: 'Main',
      city: 'Albany',
      state: 'NY',
    };
    const result = applyCompoundFields(record);
    expect(result.name).toBe('John Smith');
    expect(result.address).toBe('Main, Albany, NY');
  });

  it('skips name when config.name is false', () => {
    const record = { firstName: 'John', lastName: 'Smith' };
    const result = applyCompoundFields(record, { name: false, address: false });
    expect(result.name).toBeUndefined();
  });

  it('skips address when config.address is false', () => {
    const record = { street: 'Main', city: 'Albany' };
    const result = applyCompoundFields(record, { name: false, address: false });
    expect(result.address).toBeUndefined();
  });

  it('applies only name when address is false', () => {
    const record = {
      firstName: 'John',
      lastName: 'Smith',
      street: 'Main',
      city: 'Albany',
    };
    const result = applyCompoundFields(record, {
      name: true,
      address: false,
    });
    expect(result.name).toBe('John Smith');
    expect(result.address).toBeUndefined();
  });

  it('applies only address when name is false', () => {
    const record = {
      firstName: 'John',
      street: 'Main',
      city: 'Albany',
      state: 'NY',
    };
    const result = applyCompoundFields(record, {
      name: false,
      address: true,
    });
    expect(result.name).toBeUndefined();
    expect(result.address).toBe('Main, Albany, NY');
  });
});

describe('determineColumnsToInclude', () => {
  it('adds compound fields first when requested', () => {
    const result = determineColumnsToInclude(['email']);
    expect(result).toEqual(['name', 'address', 'email']);
  });

  it('respects columnOrder when provided', () => {
    const result = determineColumnsToInclude(
      ['email', 'firstName'],
      { name: true, address: true },
      ['email', 'name', 'address', 'firstName'],
    );
    expect(result).toContain('email');
    expect(result[0]).toBe('email');
  });

  it('does not add compound fields when disabled', () => {
    const result = determineColumnsToInclude(['email'], {
      name: false,
      address: false,
    });
    expect(result).toEqual(['email']);
  });

  it('handles empty selectedFields with compound fields enabled', () => {
    const result = determineColumnsToInclude([]);
    expect(result).toEqual(['name', 'address']);
  });

  it('deduplicates fields', () => {
    const result = determineColumnsToInclude(['email', 'email'] as any, {
      name: false,
      address: false,
    });
    expect(result.filter((c) => c === 'email')).toHaveLength(1);
  });

  it('appends columns not in columnOrder at the end', () => {
    const result = determineColumnsToInclude(
      ['email', 'party'],
      { name: false, address: false },
      ['party'],
    );
    expect(result).toEqual(['party', 'email']);
  });
});

describe('extractFieldValue', () => {
  it('returns computed name when missing', () => {
    const record = { firstName: 'Jane', lastName: 'Doe' };
    expect(extractFieldValue(record, 'name')).toBe('Jane Doe');
  });

  it('returns pre-computed name when present', () => {
    const record = { name: 'Pre-computed Name', firstName: 'Jane' };
    expect(extractFieldValue(record, 'name')).toBe('Pre-computed Name');
  });

  it('returns computed address when missing', () => {
    const record = { street: 'Elm St', city: 'Rochester', state: 'NY' };
    expect(extractFieldValue(record, 'address')).toBe('Elm St, Rochester, NY');
  });

  it('returns pre-computed address when present', () => {
    const record = { address: 'Pre-computed Addr', street: 'Elm St' };
    expect(extractFieldValue(record, 'address')).toBe('Pre-computed Addr');
  });

  it('returns scalar field value', () => {
    const record = { email: 'test@example.com' };
    expect(extractFieldValue(record, 'email')).toBe('test@example.com');
  });

  it('returns empty string for missing scalar field', () => {
    const record = {};
    expect(extractFieldValue(record, 'email')).toBe('');
  });

  it('preserves falsy number 0', () => {
    const record = { houseNum: 0 };
    expect(extractFieldValue(record, 'houseNum')).toBe(0);
  });
});

describe('sanitizeVoterRecord', () => {
  it('converts undefined to null for nullable fields', () => {
    const record = makePrismaRecord({ lastName: undefined });
    const result = sanitizeVoterRecord(record);
    expect(result.lastName).toBeNull();
  });

  it('defaults latestRecordEntryYear to 0 when undefined', () => {
    const record = makePrismaRecord({
      latestRecordEntryYear: undefined as unknown as number,
    });
    const result = sanitizeVoterRecord(record);
    expect(result.latestRecordEntryYear).toBe(0);
  });

  it('defaults latestRecordEntryNumber to 0 when undefined', () => {
    const record = makePrismaRecord({
      latestRecordEntryNumber: undefined as unknown as number,
    });
    const result = sanitizeVoterRecord(record);
    expect(result.latestRecordEntryNumber).toBe(0);
  });

  it('converts undefined to null for all nullable fields', () => {
    const nullableFields = [
      'committeeId',
      'addressForCommittee',
      'lastName',
      'firstName',
      'middleInitial',
      'suffixName',
      'houseNum',
      'street',
      'apartment',
      'halfAddress',
      'resAddrLine2',
      'resAddrLine3',
      'city',
      'state',
      'zipCode',
      'zipSuffix',
      'telephone',
      'email',
      'mailingAddress1',
      'mailingAddress2',
      'mailingAddress3',
      'mailingAddress4',
      'mailingCity',
      'mailingState',
      'mailingZip',
      'mailingZipSuffix',
      'party',
      'gender',
      'DOB',
      'L_T',
      'electionDistrict',
      'countyLegDistrict',
      'stateAssmblyDistrict',
      'stateSenateDistrict',
      'congressionalDistrict',
      'CC_WD_Village',
      'townCode',
      'lastUpdate',
      'originalRegDate',
      'statevid',
      'hasDiscrepancy',
    ] as const;

    const overrides = Object.fromEntries(
      nullableFields.map((f) => [f, undefined]),
    );
    const record = makePrismaRecord(overrides as any);
    const result = sanitizeVoterRecord(record);

    nullableFields.forEach((field) => {
      expect(result[field as keyof typeof result]).toBeNull();
    });
  });

  it('preserves non-null values unchanged', () => {
    const record = makePrismaRecord({
      firstName: 'John',
      lastName: 'Doe',
      houseNum: 42,
      email: 'john@example.com',
    });
    const result = sanitizeVoterRecord(record);
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Doe');
    expect(result.houseNum).toBe(42);
    expect(result.email).toBe('john@example.com');
  });
});

describe('mapVoterRecordToMemberWithFields', () => {
  it('returns null for record with empty VRCNUM', () => {
    const record = makePrismaRecord({ VRCNUM: '' });
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = mapVoterRecordToMemberWithFields(record);
    expect(result).toBeNull();
    spy.mockRestore();
  });

  it('returns null for record with whitespace-only VRCNUM', () => {
    const record = makePrismaRecord({ VRCNUM: '   ' });
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = mapVoterRecordToMemberWithFields(record);
    expect(result).toBeNull();
    spy.mockRestore();
  });

  it('returns member with includeFields', () => {
    const record = makePrismaRecord({ VRCNUM: '123', email: 'x@y.com' });
    const result = mapVoterRecordToMemberWithFields(record, ['email']);
    expect(result).not.toBeNull();
    expect(result?.VRCNUM).toBe('123');
    expect(result?.email).toBe('x@y.com');
  });

  it('converts Date to string when mapping Prisma record', () => {
    const dob = new Date('1990-05-15T00:00:00.000Z');
    const record = makePrismaRecord({ VRCNUM: '123', DOB: dob });
    const result = mapVoterRecordToMemberWithFields(record, ['DOB']);
    expect(result).not.toBeNull();
    expect(result?.DOB).toBe('1990-05-15T00:00:00.000Z');
  });

  it('includes address sub-fields when compound address is enabled', () => {
    const record = makePrismaRecord({
      VRCNUM: '123',
      street: 'Main St',
      city: 'Albany',
      state: 'NY',
    });
    const result = mapVoterRecordToMemberWithFields(record, [], {
      name: false,
      address: true,
    });
    expect(result).not.toBeNull();
    expect(result?.street).toBe('Main St');
    expect(result?.city).toBe('Albany');
  });
});

describe('mapVoterRecordAPIToMemberWithFields', () => {
  it('returns null for invalid VRCNUM', () => {
    const voter = {
      VRCNUM: '',
      latestRecordEntryYear: 2024,
      latestRecordEntryNumber: 1,
    } as Parameters<typeof mapVoterRecordAPIToMemberWithFields>[0];
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = mapVoterRecordAPIToMemberWithFields(voter);
    expect(result).toBeNull();
    spy.mockRestore();
  });

  it('includes name components when compound name is requested', () => {
    const voter = {
      VRCNUM: '123',
      firstName: 'John',
      lastName: 'Smith',
      latestRecordEntryYear: 2024,
      latestRecordEntryNumber: 1,
    } as Parameters<typeof mapVoterRecordAPIToMemberWithFields>[0];
    const result = mapVoterRecordAPIToMemberWithFields(voter, [], {
      name: true,
      address: false,
    });
    expect(result).not.toBeNull();
    expect(result?.firstName).toBe('John');
    expect(result?.lastName).toBe('Smith');
  });

  it('includes address sub-fields when compound address is requested', () => {
    const voter = {
      VRCNUM: '123',
      street: 'Main St',
      city: 'Albany',
      state: 'NY',
      latestRecordEntryYear: 2024,
      latestRecordEntryNumber: 1,
    } as Parameters<typeof mapVoterRecordAPIToMemberWithFields>[0];
    const result = mapVoterRecordAPIToMemberWithFields(voter, [], {
      name: false,
      address: true,
    });
    expect(result).not.toBeNull();
    expect(result?.street).toBe('Main St');
    expect(result?.city).toBe('Albany');
  });

  it('includes explicit fields with no compound fields', () => {
    const voter = {
      VRCNUM: '123',
      email: 'test@example.com',
      party: 'DEM',
      latestRecordEntryYear: 2024,
      latestRecordEntryNumber: 1,
    } as Parameters<typeof mapVoterRecordAPIToMemberWithFields>[0];
    const result = mapVoterRecordAPIToMemberWithFields(
      voter,
      ['email', 'party'],
      { name: false, address: false },
    );
    expect(result).not.toBeNull();
    expect(result?.email).toBe('test@example.com');
    expect(result?.party).toBe('DEM');
  });
});
