/**
 * Unit tests for the committee residency rule.
 */
import type {
  CommitteeList,
  LtedDistrictCrosswalk,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import {
  checkAssemblyDistrictResidency,
  checkCommitteeResidency,
  committeeResidencySearchFilter,
  findCommitteeAssemblyDistrict,
  findCommitteeAssemblyDistricts,
  prepareCommitteeResidencyChecks,
} from '../committeeResidency';

const LTED_A = { cityTown: 'A', legDistrict: 1, electionDistrict: 1 };
const LTED_B = { cityTown: 'B', legDistrict: 2, electionDistrict: 2 };

// The rows the module selects, so fixtures are checked against the Prisma models.
type CommitteeLtedRow = Pick<
  CommitteeList,
  'cityTown' | 'legDistrict' | 'electionDistrict'
>;
type CrosswalkAssemblyDistrictRow = Pick<
  LtedDistrictCrosswalk,
  'stateAssemblyDistrict'
>;
type CrosswalkLtedRow = Pick<
  LtedDistrictCrosswalk,
  'cityTown' | 'legDistrict' | 'electionDistrict' | 'stateAssemblyDistrict'
>;

function createDbMock() {
  const db = {
    committeeList: {
      findUnique: jest.fn<
        Promise<CommitteeLtedRow | null>,
        [Prisma.CommitteeListFindUniqueArgs]
      >(),
    },
    ltedDistrictCrosswalk: {
      findUnique: jest.fn<
        Promise<CrosswalkAssemblyDistrictRow | null>,
        [Prisma.LtedDistrictCrosswalkFindUniqueArgs]
      >(),
      findMany: jest.fn<
        Promise<CrosswalkLtedRow[]>,
        [Prisma.LtedDistrictCrosswalkFindManyArgs]
      >(),
    },
  };
  // The module only touches these delegates; the cast stops at this helper.
  return { db, client: db as unknown as PrismaClient };
}

function isMismatch(
  voterAssemblyDistrict: string | null,
  expectedAssemblyDistrict: string | null,
): boolean {
  return (
    checkAssemblyDistrictResidency(
      voterAssemblyDistrict,
      expectedAssemblyDistrict,
    ) !== null
  );
}

describe('checkAssemblyDistrictResidency', () => {
  it('passes for exact match', () => {
    expect(isMismatch('1', '1')).toBe(false);
  });

  it('passes when whitespace differs only', () => {
    expect(isMismatch(' 1 ', '1')).toBe(false);
  });

  it('fails for different assembly districts', () => {
    expect(isMismatch('2', '1')).toBe(true);
  });

  it('fails when voter AD is missing but expected AD is present', () => {
    expect(isMismatch(null, '1')).toBe(true);
  });

  it('fails when expected AD is missing even if voter AD is empty', () => {
    expect(isMismatch(null, null)).toBe(true);
    expect(isMismatch('', null)).toBe(true);
    expect(isMismatch('', '')).toBe(true);
  });

  it('fails when voter AD is empty but expected AD is present', () => {
    expect(isMismatch('', '1')).toBe(true);
  });

  it('reports both ADs trimmed, with empty values as null', () => {
    expect(checkAssemblyDistrictResidency(' 2 ', ' 1 ')).toEqual({
      expectedAssemblyDistrict: '1',
      voterAssemblyDistrict: '2',
    });
    expect(checkAssemblyDistrictResidency('  ', null)).toEqual({
      expectedAssemblyDistrict: null,
      voterAssemblyDistrict: null,
    });
  });
});

describe('findCommitteeAssemblyDistrict', () => {
  it('looks up the crosswalk by the LTED key and trims the AD', async () => {
    const { db, client } = createDbMock();
    db.ltedDistrictCrosswalk.findUnique.mockResolvedValue({
      stateAssemblyDistrict: ' 7 ',
    });

    await expect(findCommitteeAssemblyDistrict(client, LTED_A)).resolves.toBe(
      '7',
    );
    expect(db.ltedDistrictCrosswalk.findUnique).toHaveBeenCalledWith({
      where: { cityTown_legDistrict_electionDistrict: LTED_A },
      select: { stateAssemblyDistrict: true },
    });
  });

  it('returns null when there is no crosswalk row', async () => {
    const { db, client } = createDbMock();
    db.ltedDistrictCrosswalk.findUnique.mockResolvedValue(null);

    await expect(
      findCommitteeAssemblyDistrict(client, LTED_A),
    ).resolves.toBeNull();
  });

  it('returns null when the AD is empty', async () => {
    const { db, client } = createDbMock();
    db.ltedDistrictCrosswalk.findUnique.mockResolvedValue({
      stateAssemblyDistrict: '  ',
    });

    await expect(
      findCommitteeAssemblyDistrict(client, LTED_A),
    ).resolves.toBeNull();
  });
});

describe('findCommitteeAssemblyDistricts', () => {
  it('queries each LTED once and looks ADs up by LTED', async () => {
    const { db, client } = createDbMock();
    db.ltedDistrictCrosswalk.findMany.mockResolvedValue([
      { ...LTED_A, stateAssemblyDistrict: ' 1 ' },
      { ...LTED_B, stateAssemblyDistrict: '' },
    ]);

    const lookup = await findCommitteeAssemblyDistricts(client, [
      LTED_A,
      { ...LTED_A },
      LTED_B,
      { cityTown: 'C', legDistrict: 3, electionDistrict: 3 },
    ]);

    expect(db.ltedDistrictCrosswalk.findMany).toHaveBeenCalledTimes(1);
    expect(
      db.ltedDistrictCrosswalk.findMany.mock.calls[0][0].where?.OR,
    ).toHaveLength(3);
    expect(lookup(LTED_A)).toBe('1');
    expect(lookup(LTED_B)).toBeNull();
    expect(
      lookup({ cityTown: 'C', legDistrict: 3, electionDistrict: 3 }),
    ).toBeNull();
  });

  it('runs no query for an empty batch', async () => {
    const { db, client } = createDbMock();

    const lookup = await findCommitteeAssemblyDistricts(client, []);

    expect(db.ltedDistrictCrosswalk.findMany).not.toHaveBeenCalled();
    expect(lookup(LTED_A)).toBeNull();
  });
});

describe('checkCommitteeResidency', () => {
  it('runs no queries when the AD check is off', async () => {
    const { db, client } = createDbMock();

    await expect(
      checkCommitteeResidency(client, {
        committeeListId: 1,
        voterAssemblyDistrict: '2',
        requireAssemblyDistrictMatch: false,
      }),
    ).resolves.toBeNull();
    expect(db.committeeList.findUnique).not.toHaveBeenCalled();
    expect(db.ltedDistrictCrosswalk.findUnique).not.toHaveBeenCalled();
  });

  it("passes a voter in the committee's AD", async () => {
    const { db, client } = createDbMock();
    db.committeeList.findUnique.mockResolvedValue(LTED_A);
    db.ltedDistrictCrosswalk.findUnique.mockResolvedValue({
      stateAssemblyDistrict: '1',
    });

    await expect(
      checkCommitteeResidency(client, {
        committeeListId: 1,
        voterAssemblyDistrict: '1',
        requireAssemblyDistrictMatch: true,
      }),
    ).resolves.toBeNull();
  });

  it('fails a voter in a different AD', async () => {
    const { db, client } = createDbMock();
    db.committeeList.findUnique.mockResolvedValue(LTED_A);
    db.ltedDistrictCrosswalk.findUnique.mockResolvedValue({
      stateAssemblyDistrict: '1',
    });

    await expect(
      checkCommitteeResidency(client, {
        committeeListId: 1,
        voterAssemblyDistrict: '2',
        requireAssemblyDistrictMatch: true,
      }),
    ).resolves.toEqual({
      expectedAssemblyDistrict: '1',
      voterAssemblyDistrict: '2',
    });
  });

  it('fails when the committee does not exist', async () => {
    const { db, client } = createDbMock();
    db.committeeList.findUnique.mockResolvedValue(null);

    await expect(
      checkCommitteeResidency(client, {
        committeeListId: 1,
        voterAssemblyDistrict: '1',
        requireAssemblyDistrictMatch: true,
      }),
    ).resolves.toEqual({
      expectedAssemblyDistrict: null,
      voterAssemblyDistrict: '1',
    });
    expect(db.ltedDistrictCrosswalk.findUnique).not.toHaveBeenCalled();
  });
});

describe('prepareCommitteeResidencyChecks', () => {
  it('runs no query and passes everyone when the AD check is off', async () => {
    const { db, client } = createDbMock();

    const check = await prepareCommitteeResidencyChecks(
      client,
      [LTED_A],
      false,
    );

    expect(db.ltedDistrictCrosswalk.findMany).not.toHaveBeenCalled();
    expect(check(LTED_A, '99')).toBeNull();
  });

  it("checks each voter against their committee's AD", async () => {
    const { db, client } = createDbMock();
    db.ltedDistrictCrosswalk.findMany.mockResolvedValue([
      { ...LTED_A, stateAssemblyDistrict: '1' },
    ]);

    const check = await prepareCommitteeResidencyChecks(
      client,
      [LTED_A, LTED_B],
      true,
    );

    expect(check(LTED_A, '1')).toBeNull();
    expect(check(LTED_A, '2')).toEqual({
      expectedAssemblyDistrict: '1',
      voterAssemblyDistrict: '2',
    });
    expect(check(LTED_B, '2')).toEqual({
      expectedAssemblyDistrict: null,
      voterAssemblyDistrict: '2',
    });
  });
});

describe('committeeResidencySearchFilter', () => {
  it("filters on the committee's AD, trimmed", () => {
    expect(committeeResidencySearchFilter(' 134 ', true)).toEqual([
      { field: 'stateAssmblyDistrict', values: ['134'] },
    ]);
  });

  it('adds no condition when the AD check is off, even without an AD', () => {
    expect(committeeResidencySearchFilter('134', false)).toEqual([]);
    expect(committeeResidencySearchFilter(null, false)).toEqual([]);
  });

  it('returns null when the check is on and the committee has no AD', () => {
    expect(committeeResidencySearchFilter(null, true)).toBeNull();
    expect(committeeResidencySearchFilter('  ', true)).toBeNull();
  });
});
