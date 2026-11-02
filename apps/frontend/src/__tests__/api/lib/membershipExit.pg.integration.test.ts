/**
 * PostgreSQL-backed proof of the Exit Report invariants (ADR 0002). The unit
 * tests mock Prisma, so only a real database shows that the CHECK constraints
 * exist and hold, that the conditional writes refuse a stale or re-filed
 * report, and that a refused write (P2025) leaves the transaction usable.
 *
 * Needs a database built by `prisma migrate deploy` (the constraints are raw
 * SQL that `db push` doesn't apply). Run with
 * `pnpm --filter voter-file-tool test:pg`; skips without a local test URL.
 */
import { PrivilegeLevel, type PrismaClient } from "@prisma/client";
import type * as MembershipExit from "~/app/api/lib/membershipExit";

const canRunPg = Boolean(process.env.POSTGRES_PRISMA_URL_TEST);
if (!canRunPg) {
  console.warn(
    "Skipping PostgreSQL integration tests: set POSTGRES_PRISMA_URL_TEST, or use a localhost POSTGRES_PRISMA_URL",
  );
}
const describePg = canRunPg ? describe : describe.skip;

const TERM_ID = "pg-exit-term";
const LEADER_ID = "pg-exit-leader";

describePg("Exit Reports on the membership row (PostgreSQL)", () => {
  let prisma: PrismaClient;
  let exits: typeof MembershipExit;
  let membershipId: string;

  beforeAll(async () => {
    prisma = (await import("~/lib/prisma")).default;
    exits = await import("~/app/api/lib/membershipExit");
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "AuditLog", "CommitteeMembership", "CommitteeList", "CommitteeTerm", "VoterRecord", "User" CASCADE`,
    );
    await prisma.user.create({
      data: {
        id: LEADER_ID,
        email: "leader@example.org",
        privilegeLevel: PrivilegeLevel.Leader,
      },
    });
    await prisma.committeeTerm.create({
      data: {
        id: TERM_ID,
        label: "PG exit term",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2028-12-31"),
        isActive: true,
      },
    });
    const committee = await prisma.committeeList.create({
      data: {
        cityTown: "PG EXIT TOWN",
        legDistrict: 1,
        electionDistrict: 1,
        termId: TERM_ID,
      },
    });
    await prisma.voterRecord.create({
      data: {
        VRCNUM: "PGEXIT1",
        latestRecordEntryYear: 2026,
        latestRecordEntryNumber: 1,
      },
    });
    const membership = await prisma.committeeMembership.create({
      data: {
        voterRecordId: "PGEXIT1",
        committeeListId: committee.id,
        termId: TERM_ID,
        status: "ACTIVE",
        membershipType: "PETITIONED",
        seatNumber: 1,
      },
    });
    membershipId = membership.id;
  });

  const fileReport = () =>
    prisma.$transaction((tx) =>
      exits.fileExitReport(tx, membershipId, {
        kind: "RESIGNATION",
        reportedById: LEADER_ID,
        resignationDateReceived: new Date("2026-10-30"),
        resignationMethod: "EMAIL",
        removalReason: "OTHER",
        removalNotes: "Moving away",
      }),
    );

  const readState = () =>
    prisma.committeeMembership.findUniqueOrThrow({
      where: { id: membershipId },
    });

  it("refuses report fields on a row that isn't ACTIVE", async () => {
    await fileReport();
    await expect(
      prisma.committeeMembership.update({
        where: { id: membershipId },
        data: { status: "REMOVED" },
      }),
    ).rejects.toThrow(/CommitteeMembership_exit_report_only_while_active/);
  });

  it("refuses exitReportedAt without exitReportedKind, and the reverse", async () => {
    await expect(
      prisma.committeeMembership.update({
        where: { id: membershipId },
        data: { exitReportedAt: new Date() },
      }),
    ).rejects.toThrow(/CommitteeMembership_exit_report_kind_with_reported_at/);
    await expect(
      prisma.committeeMembership.update({
        where: { id: membershipId },
        data: { exitReportedKind: "REMOVAL" },
      }),
    ).rejects.toThrow(/CommitteeMembership_exit_report_kind_with_reported_at/);
  });

  it("keeps the member ACTIVE and seated with a report, and refuses a second report", async () => {
    const reportedAt = await fileReport();
    expect(reportedAt).toBeInstanceOf(Date);
    expect(await fileReport()).toBeNull();

    const row = await readState();
    expect(row).toMatchObject({
      status: "ACTIVE",
      seatNumber: 1,
      exitReportedKind: "RESIGNATION",
      exitReportedById: LEADER_ID,
      removalReason: "OTHER",
    });
    expect(
      await prisma.committeeMembership.count({
        where: { termId: TERM_ID, status: "ACTIVE" },
      }),
    ).toBe(1);
  });

  it("confirms only the report the Admin saw, writing every exit field", async () => {
    const reportedAt = await fileReport();
    const state = await readState();

    // Rejected and filed again: the Admin's old timestamp no longer matches.
    await prisma.$transaction((tx) =>
      exits.clearRejectedExitReport(tx, membershipId, reportedAt!),
    );
    await fileReport();
    const stale = await prisma.$transaction((tx) =>
      exits.writeMembershipExit(
        tx,
        state,
        {
          status: "REMOVED",
          resignationDateReceived: null,
          resignationMethod: null,
          removalReason: "DECEASED",
          removalNotes: null,
        },
        { expectedExitReportedAt: reportedAt! },
      ),
    );
    expect(stale).toEqual({ kind: "changed" });

    const fresh = await readState();
    const confirmed = await prisma.$transaction((tx) =>
      exits.writeMembershipExit(
        tx,
        fresh,
        {
          status: "REMOVED",
          resignationDateReceived: null,
          resignationMethod: null,
          removalReason: "DECEASED",
          removalNotes: null,
        },
        { expectedExitReportedAt: fresh.exitReportedAt! },
      ),
    );
    expect(confirmed).toMatchObject({
      kind: "written",
      clearedReport: { kind: "RESIGNATION", reportedById: LEADER_ID },
    });
    expect(await readState()).toMatchObject({
      status: "REMOVED",
      removalReason: "DECEASED",
      removalNotes: null,
      resignationDateReceived: null,
      resignationMethod: null,
      exitReportedAt: null,
      exitReportedById: null,
      exitReportedKind: null,
    });
  });

  it("refuses a superseding exit from a stale read without poisoning the transaction", async () => {
    const before = await readState(); // no report yet
    await fileReport();

    const result = await prisma.$transaction(async (tx) => {
      const exit = await exits.writeMembershipExit(tx, before, {
        status: "REMOVED",
        resignationDateReceived: null,
        resignationMethod: null,
        removalReason: "OTHER",
        removalNotes: "Removed by bulk import synchronization",
      });
      // P2025 is not an SQL error: the transaction can keep going.
      const count = await tx.committeeMembership.count({
        where: { id: membershipId, status: "ACTIVE" },
      });
      return { exit, count };
    });

    expect(result).toEqual({ exit: { kind: "changed" }, count: 1 });
    expect((await readState()).exitReportedKind).toBe("RESIGNATION");
  });

  it("rejecting clears the report and the four exit fields, leaving the member ACTIVE", async () => {
    const reportedAt = await fileReport();
    expect(
      await prisma.$transaction((tx) =>
        exits.clearRejectedExitReport(tx, membershipId, new Date(0)),
      ),
    ).toBe(false);
    expect(
      await prisma.$transaction((tx) =>
        exits.clearRejectedExitReport(tx, membershipId, reportedAt!),
      ),
    ).toBe(true);
    expect(await readState()).toMatchObject({
      status: "ACTIVE",
      seatNumber: 1,
      exitReportedAt: null,
      exitReportedKind: null,
      removalReason: null,
      removalNotes: null,
      resignationDateReceived: null,
      resignationMethod: null,
    });
  });
});
