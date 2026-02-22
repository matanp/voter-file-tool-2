import {
  computeDesignationWeight,
  fetchCommitteeData,
  fetchSignInSheetData,
  fetchDesignationWeights,
  fetchVacancyData,
  fetchChangesData,
  fetchPetitionOutcomesData,
  getPetitionOutcomeLabel,
  mapCommitteesToReportShape,
  type CommitteeWithMembers,
} from '../committeeMappingHelpers';
import { prisma } from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  prisma: {
    committeeTerm: {
      findFirst: jest.fn(),
    },
    committeeList: {
      findMany: jest.fn(),
    },
    committeeGovernanceConfig: {
      findFirst: jest.fn(),
    },
    committeeMembership: {
      findMany: jest.fn(),
    },
  },
}));

type MockPrisma = {
  committeeTerm: { findFirst: jest.Mock };
  committeeList: { findMany: jest.Mock };
  committeeGovernanceConfig: { findFirst: jest.Mock };
  committeeMembership: { findMany: jest.Mock };
};

const prismaMock = prisma as unknown as MockPrisma;

describe('fetchCommitteeData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads active members from CommitteeMembership with voterRecord include', async () => {
    prismaMock.committeeTerm.findFirst.mockResolvedValue({ id: 'term-1' });
    prismaMock.committeeList.findMany.mockResolvedValue([]);

    await fetchCommitteeData();

    expect(prismaMock.committeeList.findMany).toHaveBeenCalledWith({
      where: { termId: 'term-1' },
      include: {
        memberships: {
          where: {
            termId: 'term-1',
            status: 'ACTIVE',
          },
          include: {
            voterRecord: true,
          },
        },
      },
    });
  });

  it('throws when there is no active term', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    prismaMock.committeeTerm.findFirst.mockResolvedValue(null);

    await expect(fetchCommitteeData()).rejects.toThrow(
      /No active CommitteeTerm/,
    );
    expect(prismaMock.committeeList.findMany).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('fetchSignInSheetData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches all committees when scope is countywide (no cityTown/legDistrict filter)', async () => {
    prismaMock.committeeTerm.findFirst.mockResolvedValue({ id: 'term-1' });
    prismaMock.committeeList.findMany.mockResolvedValue([]);

    await fetchSignInSheetData('countywide');

    expect(prismaMock.committeeList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { termId: 'term-1' },
        include: expect.any(Object),
        orderBy: [
          { cityTown: 'asc' },
          { legDistrict: 'asc' },
          { electionDistrict: 'asc' },
        ],
      }),
    );
  });

  it('filters by cityTown when scope is jurisdiction', async () => {
    prismaMock.committeeTerm.findFirst.mockResolvedValue({ id: 'term-1' });
    prismaMock.committeeList.findMany.mockResolvedValue([]);

    await fetchSignInSheetData('jurisdiction', 'ROCHESTER');

    expect(prismaMock.committeeList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { termId: 'term-1', cityTown: 'ROCHESTER' },
      }),
    );
  });

  it('filters by cityTown and legDistrict when scope is jurisdiction', async () => {
    prismaMock.committeeTerm.findFirst.mockResolvedValue({ id: 'term-1' });
    prismaMock.committeeList.findMany.mockResolvedValue([]);

    await fetchSignInSheetData('jurisdiction', 'ROCHESTER', 1);

    expect(prismaMock.committeeList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { termId: 'term-1', cityTown: 'ROCHESTER', legDistrict: 1 },
      }),
    );
  });

  it('throws when scope is jurisdiction and cityTown is empty', async () => {
    prismaMock.committeeTerm.findFirst.mockResolvedValue({ id: 'term-1' });

    await expect(
      fetchSignInSheetData('jurisdiction', ''),
    ).rejects.toThrow(/cityTown is required when scope is jurisdiction/);
    await expect(
      fetchSignInSheetData('jurisdiction', undefined),
    ).rejects.toThrow(/cityTown is required when scope is jurisdiction/);
    expect(prismaMock.committeeList.findMany).not.toHaveBeenCalled();
  });
});

describe('fetchDesignationWeights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches all committees when scope is countywide or omitted', async () => {
    prismaMock.committeeTerm.findFirst.mockResolvedValue({ id: 'term-1' });
    prismaMock.committeeList.findMany.mockResolvedValue([]);

    await fetchDesignationWeights('countywide');
    await fetchDesignationWeights();

    expect(prismaMock.committeeList.findMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.committeeList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { termId: 'term-1' },
        include: expect.objectContaining({
          seats: { orderBy: { seatNumber: 'asc' } },
        }),
        orderBy: [
          { cityTown: 'asc' },
          { legDistrict: 'asc' },
          { electionDistrict: 'asc' },
        ],
      }),
    );
  });

  it('filters by cityTown when scope is jurisdiction', async () => {
    prismaMock.committeeTerm.findFirst.mockResolvedValue({ id: 'term-1' });
    prismaMock.committeeList.findMany.mockResolvedValue([]);

    await fetchDesignationWeights('jurisdiction', 'ROCHESTER');

    expect(prismaMock.committeeList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { termId: 'term-1', cityTown: 'ROCHESTER' },
      }),
    );
  });

  it('filters by cityTown and legDistrict when scope is jurisdiction', async () => {
    prismaMock.committeeTerm.findFirst.mockResolvedValue({ id: 'term-1' });
    prismaMock.committeeList.findMany.mockResolvedValue([]);

    await fetchDesignationWeights('jurisdiction', 'ROCHESTER', 1);

    expect(prismaMock.committeeList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { termId: 'term-1', cityTown: 'ROCHESTER', legDistrict: 1 },
      }),
    );
  });

  it('throws when scope is jurisdiction and cityTown is empty', async () => {
    prismaMock.committeeTerm.findFirst.mockResolvedValue({ id: 'term-1' });

    await expect(
      fetchDesignationWeights('jurisdiction', ''),
    ).rejects.toThrow(/cityTown is required when scope is jurisdiction/);
    await expect(
      fetchDesignationWeights('jurisdiction', undefined),
    ).rejects.toThrow(/cityTown is required when scope is jurisdiction/);
    expect(prismaMock.committeeList.findMany).not.toHaveBeenCalled();
  });
});

describe('mapCommitteesToReportShape', () => {
  it('builds report members from memberships/voterRecord records', () => {
    const input: CommitteeWithMembers[] = [
      {
        id: 1,
        cityTown: 'ROCHESTER',
        legDistrict: 1,
        electionDistrict: 42,
        termId: 'term-1',
        ltedWeight: null,
        memberships: [
          {
            id: 'membership-1',
            voterRecordId: 'VRC001',
            committeeListId: 1,
            termId: 'term-1',
            status: 'ACTIVE',
            membershipType: 'APPOINTED',
            seatNumber: 1,
            submittedAt: new Date('2025-01-01'),
            activatedAt: new Date('2025-01-02'),
            confirmedAt: null,
            resignedAt: null,
            removedAt: null,
            rejectedAt: null,
            rejectionNote: null,
            removalReason: null,
            removalNotes: null,
            resignationDateReceived: null,
            resignationMethod: null,
            petitionVoteCount: null,
            petitionPrimaryDate: null,
            submittedById: null,
            submissionMetadata: null,
            meetingRecordId: null,
            voterRecord: {
              VRCNUM: 'VRC001',
              latestRecordEntryYear: 2025,
              latestRecordEntryNumber: 1,
              firstName: 'Jane',
              middleInitial: null,
              lastName: 'Doe',
              suffixName: null,
              houseNum: 123,
              halfAddress: null,
              street: 'Main St',
              apartment: null,
              resAddrLine2: null,
              resAddrLine3: null,
              city: 'ROCHESTER',
              state: 'NY',
              zipCode: '14604',
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
              party: 'DEM',
              gender: null,
              DOB: null,
              L_T: null,
              electionDistrict: 42,
              countyLegDistrict: '1',
              stateAssmblyDistrict: '1',
              stateSenateDistrict: '1',
              congressionalDistrict: '1',
              CC_WD_Village: null,
              townCode: '001',
              lastUpdate: null,
              originalRegDate: null,
              statevid: null,
              hasDiscrepancy: null,
              addressForCommittee: null,
              committeeId: null,
            },
          },
        ],
      },
    ];
    const output = mapCommitteesToReportShape(input);

    expect(output).toHaveLength(1);
    expect(output[0]).toMatchObject({
      cityTown: 'ROCHESTER',
      legDistrict: 1,
      committees: {
        '42': [expect.objectContaining({ VRCNUM: 'VRC001' })],
      },
    });
  });

  it('excludes committees with no active memberships from report shape', () => {
    const input: CommitteeWithMembers[] = [
      {
        id: 1,
        cityTown: 'ROCHESTER',
        legDistrict: 1,
        electionDistrict: 42,
        termId: 'term-1',
        ltedWeight: null,
        memberships: [],
      },
    ];
    const output = mapCommitteesToReportShape(input);
    expect(output).toHaveLength(0);
  });
});

describe('computeDesignationWeight', () => {
  it('throws deterministic error for duplicate active memberships on same seat', () => {
    expect(() =>
      computeDesignationWeight({
        id: 1,
        cityTown: 'ROCHESTER',
        legDistrict: 1,
        electionDistrict: 1,
        termId: 'term-1',
        ltedWeight: null,
        seats: [
          {
            id: 'seat-1',
            committeeListId: 1,
            termId: 'term-1',
            seatNumber: 1,
            isPetitioned: true,
            weight: 0.25,
          },
        ],
        memberships: [
          {
            id: 'm-1',
            voterRecordId: 'voter-1',
            committeeListId: 1,
            termId: 'term-1',
            status: 'ACTIVE',
            membershipType: 'PETITIONED',
            seatNumber: 1,
            submittedAt: new Date('2025-01-01'),
            activatedAt: null,
            confirmedAt: null,
            resignedAt: null,
            removedAt: null,
            rejectedAt: null,
            rejectionNote: null,
            removalReason: null,
            removalNotes: null,
            resignationDateReceived: null,
            resignationMethod: null,
            petitionVoteCount: null,
            petitionPrimaryDate: null,
            submittedById: null,
            submissionMetadata: null,
            meetingRecordId: null,
            voterRecord: {
              VRCNUM: 'voter-1',
              latestRecordEntryYear: 2025,
              latestRecordEntryNumber: 1,
              firstName: null,
              middleInitial: null,
              lastName: null,
              suffixName: null,
              houseNum: null,
              halfAddress: null,
              street: null,
              apartment: null,
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
              addressForCommittee: null,
              committeeId: null,
            },
          },
          {
            id: 'm-2',
            voterRecordId: 'voter-2',
            committeeListId: 1,
            termId: 'term-1',
            status: 'ACTIVE',
            membershipType: 'APPOINTED',
            seatNumber: 1,
            submittedAt: new Date('2025-01-01'),
            activatedAt: null,
            confirmedAt: null,
            resignedAt: null,
            removedAt: null,
            rejectedAt: null,
            rejectionNote: null,
            removalReason: null,
            removalNotes: null,
            resignationDateReceived: null,
            resignationMethod: null,
            petitionVoteCount: null,
            petitionPrimaryDate: null,
            submittedById: null,
            submissionMetadata: null,
            meetingRecordId: null,
            voterRecord: {
              VRCNUM: 'voter-2',
              latestRecordEntryYear: 2025,
              latestRecordEntryNumber: 1,
              firstName: null,
              middleInitial: null,
              lastName: null,
              suffixName: null,
              houseNum: null,
              halfAddress: null,
              street: null,
              apartment: null,
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
              addressForCommittee: null,
              committeeId: null,
            },
          },
        ],
      } as unknown as CommitteeWithMembers),
    ).toThrow(/Data integrity error: duplicate active memberships/);
  });
});

describe('fetchVacancyData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when scope is jurisdiction and cityTown is empty', async () => {
    prismaMock.committeeTerm.findFirst.mockResolvedValue({ id: 'term-1' });

    await expect(
      fetchVacancyData('jurisdiction', 'vacantOnly', ''),
    ).rejects.toThrow(/cityTown is required when scope is jurisdiction/);
    expect(prismaMock.committeeList.findMany).not.toHaveBeenCalled();
  });

  it('fetches committees with seats and memberships when scope is countywide', async () => {
    prismaMock.committeeTerm.findFirst.mockResolvedValue({ id: 'term-1' });
    prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue({
      maxSeatsPerLted: 4,
    });
    prismaMock.committeeList.findMany.mockResolvedValue([
      {
        id: 1,
        cityTown: 'ROCHESTER',
        legDistrict: 1,
        electionDistrict: 42,
        termId: 'term-1',
        seats: [
          { seatNumber: 1, isPetitioned: false },
          { seatNumber: 2, isPetitioned: false },
          { seatNumber: 3, isPetitioned: true },
          { seatNumber: 4, isPetitioned: true },
        ],
        memberships: [
          { seatNumber: 1, voterRecord: {} },
          { seatNumber: 2, voterRecord: {} },
          { seatNumber: 3, voterRecord: {} },
        ],
      },
    ]);

    const rows = await fetchVacancyData('countywide', 'all');

    expect(prismaMock.committeeList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { termId: 'term-1' },
        include: expect.objectContaining({
          seats: expect.any(Object),
          memberships: expect.any(Object),
        }),
        orderBy: [
          { cityTown: 'asc' },
          { legDistrict: 'asc' },
          { electionDistrict: 'asc' },
        ],
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      cityTown: 'ROCHESTER',
      legDistrict: 1,
      electionDistrict: 42,
      totalSeats: 4,
      filledSeats: 3,
      vacantSeats: 1,
    });
  });
});

describe('fetchChangesData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when dateFrom or dateTo is invalid', async () => {
    prismaMock.committeeTerm.findFirst.mockResolvedValue({ id: 'term-1' });

    await expect(
      fetchChangesData('countywide', 'invalid', '2025-01-15'),
    ).rejects.toThrow(/Invalid dateFrom or dateTo/);
    await expect(
      fetchChangesData('countywide', '2025-01-15', '2025-01-01'),
    ).rejects.toThrow(/dateFrom must be <= dateTo/);
  });

  it('throws when scope is jurisdiction and cityTown is empty', async () => {
    prismaMock.committeeTerm.findFirst.mockResolvedValue({ id: 'term-1' });

    await expect(
      fetchChangesData('jurisdiction', '2025-01-01', '2025-01-31', ''),
    ).rejects.toThrow(/cityTown is required when scope is jurisdiction/);
  });
});

describe('fetchPetitionOutcomesData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when scope is jurisdiction and cityTown is empty', async () => {
    prismaMock.committeeTerm.findFirst.mockResolvedValue({ id: 'term-1' });

    await expect(
      fetchPetitionOutcomesData('jurisdiction', ''),
    ).rejects.toThrow(/cityTown is required when scope is jurisdiction/);
  });
});

describe('getPetitionOutcomeLabel', () => {
  it('returns Lost for PETITIONED_LOST', () => {
    expect(getPetitionOutcomeLabel('PETITIONED_LOST', 'PETITIONED', 2)).toBe(
      'Lost',
    );
  });
  it('returns Tie for PETITIONED_TIE', () => {
    expect(getPetitionOutcomeLabel('PETITIONED_TIE', 'PETITIONED', 2)).toBe(
      'Tie',
    );
  });
  it('returns Unopposed when ACTIVE and single candidate', () => {
    expect(getPetitionOutcomeLabel('ACTIVE', 'PETITIONED', 1)).toBe(
      'Unopposed',
    );
  });
  it('returns Won when ACTIVE and multiple candidates', () => {
    expect(getPetitionOutcomeLabel('ACTIVE', 'PETITIONED', 3)).toBe('Won');
  });
});
