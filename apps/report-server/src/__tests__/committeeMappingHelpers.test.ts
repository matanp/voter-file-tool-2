import { fetchCommitteeData } from '../committeeMappingHelpers';
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
