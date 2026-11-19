/**
 * PostgreSQL-backed proof of the one-time Seat.isPetitioned backfill
 * (leader-feedback-2026-11/06). The three evidence sources are raw SQL, including a
 * JSON read of audit rows, so only a real database can check them.
 *
 * Run with `pnpm --filter voter-file-tool test:pg`. Skips when there is no local test
 * database URL (see jest.pg.env.cjs).
 */
import { PrivilegeLevel, type Prisma, type PrismaClient } from "@prisma/client";
import type * as Backfill from "~/lib/committees/petitionedSeatBackfill";

const canRunPg = Boolean(process.env.POSTGRES_PRISMA_URL_TEST);
if (!canRunPg) {
  console.warn(
    "Skipping PostgreSQL integration tests: set POSTGRES_PRISMA_URL_TEST, or use a localhost POSTGRES_PRISMA_URL",
  );
}
const describePg = canRunPg ? describe : describe.skip;

const TERM_ID = "pg-backfill-term";
const OTHER_TERM_ID = "pg-backfill-other-term";
const ACTOR = { userId: "pg-admin", userRole: PrivilegeLevel.Admin };

describePg("Petitioned seat backfill (PostgreSQL)", () => {
  let prisma: PrismaClient;
  let backfill: typeof Backfill;
  let committeeId: number;
  let otherCommitteeId: number;
  let otherTermCommitteeId: number;

  beforeAll(async () => {
    backfill = await import("~/lib/committees/petitionedSeatBackfill");
    prisma = (await import("~/lib/prisma")).default;
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  let voterSeq = 0;
  const membership = async (data: {
    committeeListId: number;
    termId?: string;
    status: "ACTIVE" | "RESIGNED" | "REMOVED" | "PETITIONED_LOST";
    membershipType: "PETITIONED" | "APPOINTED" | null;
    seatNumber: number | null;
    petitionSeatNumber?: number | null;
  }) => {
    const VRCNUM = `PGBF${String(++voterSeq).padStart(6, "0")}`;
    await prisma.voterRecord.create({
      data: { VRCNUM, latestRecordEntryYear: 2026, latestRecordEntryNumber: 1 },
    });
    return prisma.committeeMembership.create({
      data: {
        voterRecordId: VRCNUM,
        termId: TERM_ID,
        petitionSeatNumber: null,
        ...data,
      },
    });
  };

  const activationAudit = (
    membershipId: string,
    afterValue: Prisma.InputJsonObject,
  ) =>
    prisma.auditLog.create({
      data: {
        userId: ACTOR.userId,
        userRole: ACTOR.userRole,
        action: "MEMBER_ACTIVATED",
        entityType: "CommitteeMembership",
        entityId: membershipId,
        afterValue,
      },
    });

  const petitionedSeats = async (committeeListId: number, termId = TERM_ID) =>
    (
      await prisma.seat.findMany({
        where: { committeeListId, termId, isPetitioned: true },
        select: { seatNumber: true },
        orderBy: { seatNumber: "asc" },
      })
    ).map((seat) => seat.seatNumber);

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE
        "AuditLog",
        "CommitteeMembership",
        "Seat",
        "CommitteeList",
        "CommitteeTerm",
        "VoterRecord",
        "User"
      CASCADE`,
    );
    await prisma.user.create({
      data: {
        id: ACTOR.userId,
        email: "pg-admin@internal",
        name: "PG Admin",
        privilegeLevel: PrivilegeLevel.Admin,
      },
    });
    for (const [id, isActive] of [
      [TERM_ID, true],
      [OTHER_TERM_ID, false],
    ] as const) {
      await prisma.committeeTerm.create({
        data: {
          id,
          label: id,
          startDate: new Date("2026-01-01"),
          endDate: new Date("2028-12-31"),
          isActive,
        },
      });
    }
    const makeCommittee = async (electionDistrict: number, termId: string) => {
      const committee = await prisma.committeeList.create({
        data: {
          cityTown: "ROCHESTER",
          legDistrict: 17,
          electionDistrict,
          termId,
        },
      });
      await prisma.seat.createMany({
        data: [1, 2, 3, 4].map((seatNumber) => ({
          committeeListId: committee.id,
          termId,
          seatNumber,
        })),
      });
      return committee.id;
    };
    committeeId = await makeCommittee(1, TERM_ID);
    otherCommitteeId = await makeCommittee(2, TERM_ID);
    otherTermCommitteeId = await makeCommittee(1, OTHER_TERM_ID);
  });

  it("finds petitioned seats from memberships, petition outcomes and the audit log", async () => {
    // (membership) An imported petitioned winner, still seated.
    await membership({
      committeeListId: committeeId,
      status: "ACTIVE",
      membershipType: "PETITIONED",
      seatNumber: 1,
    });
    // (membership) A petitioned winner who resigned but kept the seat number.
    await membership({
      committeeListId: committeeId,
      status: "RESIGNED",
      membershipType: "PETITIONED",
      seatNumber: 2,
    });
    // (audit) A petitioned winner removed by a later import: seatNumber is gone, the
    // activation audit row still says where they sat.
    const removed = await membership({
      committeeListId: committeeId,
      status: "REMOVED",
      membershipType: "PETITIONED",
      seatNumber: null,
    });
    await activationAudit(removed.id, {
      status: "ACTIVE",
      membershipType: "PETITIONED",
      seatNumber: 3,
    });
    // (petition) A recorded outcome names seat 4 of the other committee.
    await membership({
      committeeListId: otherCommitteeId,
      status: "PETITIONED_LOST",
      membershipType: "PETITIONED",
      seatNumber: null,
      petitionSeatNumber: 4,
    });
    // Not petitioned: an appointee, and an appointee's activation audit.
    const appointed = await membership({
      committeeListId: otherCommitteeId,
      status: "ACTIVE",
      membershipType: "APPOINTED",
      seatNumber: 1,
    });
    await activationAudit(appointed.id, {
      status: "ACTIVE",
      membershipType: "APPOINTED",
      seatNumber: 1,
    });
    // An activation audit with a null seat number is ignored.
    await activationAudit(removed.id, { status: "ACTIVE", seatNumber: null });
    // Other term: never touched.
    await membership({
      committeeListId: otherTermCommitteeId,
      termId: OTHER_TERM_ID,
      status: "ACTIVE",
      membershipType: "PETITIONED",
      seatNumber: 1,
    });

    const preview = await backfill.previewPetitionedSeatBackfill(
      prisma,
      TERM_ID,
    );

    expect(
      preview.candidates.map((c) => [
        c.electionDistrict,
        c.seatNumber,
        c.sources,
      ]),
    ).toEqual([
      [1, 1, ["membership"]],
      [1, 2, ["membership"]],
      [1, 3, ["audit"]],
      [2, 4, ["petition"]],
    ]);
    expect(preview.summary).toEqual({
      petitionedSeats: 4,
      alreadyPetitioned: 0,
      toFlag: 4,
      committees: 2,
      maxPerCommittee: 3,
      bySource: { membership: 2, petition: 1, audit: 1 },
    });
    expect(preview.missingSeats).toEqual([]);
    // A preview writes nothing.
    expect(await prisma.seat.count({ where: { isPetitioned: true } })).toBe(0);
  });

  it("uses the membership's type when an activation audit row doesn't record one", async () => {
    // Petition-outcome activations write afterValue without membershipType.
    const winner = await membership({
      committeeListId: committeeId,
      status: "REMOVED",
      membershipType: "PETITIONED",
      seatNumber: null,
    });
    await activationAudit(winner.id, { status: "ACTIVE", seatNumber: 2 });
    // An appointee whose audit row has no type stays out.
    const appointee = await membership({
      committeeListId: committeeId,
      status: "REMOVED",
      membershipType: "APPOINTED",
      seatNumber: null,
    });
    await activationAudit(appointee.id, { status: "ACTIVE", seatNumber: 3 });

    const preview = await backfill.previewPetitionedSeatBackfill(
      prisma,
      TERM_ID,
    );

    expect(preview.candidates.map((c) => c.seatNumber)).toEqual([2]);
  });

  it("flags the seats, audits each one, and does nothing on a rerun", async () => {
    await membership({
      committeeListId: committeeId,
      status: "ACTIVE",
      membershipType: "PETITIONED",
      seatNumber: 1,
    });
    await membership({
      committeeListId: committeeId,
      status: "ACTIVE",
      membershipType: "PETITIONED",
      seatNumber: 2,
    });
    // Seat 2 is already flagged (say, by a recorded outcome); it is counted, not rewritten.
    await prisma.seat.updateMany({
      where: { committeeListId: committeeId, termId: TERM_ID, seatNumber: 2 },
      data: { isPetitioned: true },
    });
    await membership({
      committeeListId: otherTermCommitteeId,
      termId: OTHER_TERM_ID,
      status: "ACTIVE",
      membershipType: "PETITIONED",
      seatNumber: 1,
    });

    const first = await backfill.applyPetitionedSeatBackfill(
      prisma,
      TERM_ID,
      ACTOR,
    );

    expect(first.flagged).toBe(1);
    expect(first.preview.summary.alreadyPetitioned).toBe(1);
    expect(await petitionedSeats(committeeId)).toEqual([1, 2]);
    expect(await petitionedSeats(otherTermCommitteeId, OTHER_TERM_ID)).toEqual(
      [],
    );
    // The recorder latch is untouched: these seats can still get an outcome recorded.
    expect(
      await prisma.seat.count({
        where: { petitionOutcomeRecordedAt: { not: null } },
      }),
    ).toBe(0);

    const audits = await prisma.auditLog.findMany({
      where: { action: "SEAT_PETITIONED_BACKFILLED" },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      userId: ACTOR.userId,
      entityType: "Seat",
      beforeValue: { isPetitioned: false },
      afterValue: { isPetitioned: true },
      metadata: expect.objectContaining({
        termId: TERM_ID,
        committeeListId: committeeId,
        seatNumber: 1,
        evidence: ["membership"],
      }) as unknown,
    });

    const second = await backfill.applyPetitionedSeatBackfill(
      prisma,
      TERM_ID,
      ACTOR,
    );
    expect(second.flagged).toBe(0);
    expect(
      await prisma.auditLog.count({
        where: { action: "SEAT_PETITIONED_BACKFILLED" },
      }),
    ).toBe(1);
  });

  it("reports a petitioned seat number with no Seat row without creating it", async () => {
    await membership({
      committeeListId: committeeId,
      status: "RESIGNED",
      membershipType: "PETITIONED",
      seatNumber: 7,
    });

    const preview = await backfill.previewPetitionedSeatBackfill(
      prisma,
      TERM_ID,
    );

    expect(preview.candidates).toEqual([]);
    expect(preview.missingSeats).toEqual([
      { committeeListId: committeeId, seatNumber: 7, sources: ["membership"] },
    ]);
    expect(await prisma.seat.count({ where: { seatNumber: 7 } })).toBe(0);
  });
});
