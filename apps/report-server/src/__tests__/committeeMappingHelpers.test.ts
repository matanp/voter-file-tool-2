import {
  fetchCommitteeData,
  mapCommitteesToReportShape,
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
  },
}));

type MockPrisma = {
  committeeTerm: {
    findFirst: jest.Mock;
  };
  committeeList: {
    findMany: jest.Mock;
  };
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

describe('mapCommitteesToReportShape', () => {
  it('builds report members from memberships/voterRecord records', () => {
    const output = mapCommitteesToReportShape([
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
            rejectedById: null,
            rejectionNote: null,
            removedById: null,
            removalReason: null,
            removalNotes: null,
            resignedById: null,
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
              ward: null,
              townCode: '001',
              lastUpdate: null,
              originalRegDate: null,
              countyVoterRegNumber: null,
              voterStatus: null,
              statusReason: null,
              inactiveDate: null,
              purgeDate: null,
              SBOEID: null,
              voterHistory: null,
              voterMailingAddress: null,
              voterMailingCity: null,
              voterMailingState: null,
              voterMailingZip: null,
              addressForCommittee: null,
              committeeId: null,
            },
          },
        ],
      } as never,
    ]);

    expect(output).toHaveLength(1);
    expect(output[0]).toMatchObject({
      cityTown: 'ROCHESTER',
      legDistrict: 1,
      committees: {
        '42': [expect.objectContaining({ VRCNUM: 'VRC001' })],
      },
    });
  });
});
