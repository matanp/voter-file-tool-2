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

  const LETTER = {
    key: "resignation-letters/m/letter.pdf",
    contentType: "application/pdf" as const,
    fileName: "letter.pdf",
  };

  const fileReport = (letter: typeof LETTER | null = null) =>
    prisma.$transaction((tx) =>
      exits.fileExitReport(tx, membershipId, {
        kind: "RESIGNATION",
        reportedById: LEADER_ID,
        resignationDateReceived: new Date("2026-10-30"),
        resignationMethod: "EMAIL",
        removalReason: "OTHER",
        removalNotes: "Moving away",
        letter,
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
      exits.clearRejectedExitReport(tx, state, reportedAt!),
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
          letter: "detach",
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
          letter: "detach",
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

  it("supersedes a report filed after a stale read, naming the report it cleared", async () => {
    const before = await readState(); // no report yet
    await fileReport();

    const result = await prisma.$transaction((tx) =>
      exits.writeMembershipExit(tx, before, {
        status: "REMOVED",
        resignationDateReceived: null,
        resignationMethod: null,
        removalReason: "OTHER",
        removalNotes: "Removed by bulk import synchronization",
        letter: "detach",
      }),
    );

    expect(result).toMatchObject({
      kind: "written",
      clearedReport: { kind: "RESIGNATION", reportedById: LEADER_ID },
    });
    expect(await readState()).toMatchObject({
      status: "REMOVED",
      exitReportedAt: null,
      removalNotes: "Removed by bulk import synchronization",
      resignationMethod: null,
    });
  });

  it("refuses a write once the row left ACTIVE, without poisoning the transaction", async () => {
    const before = await readState();
    await prisma.committeeMembership.update({
      where: { id: membershipId },
      data: { status: "RESIGNED" },
    });

    const result = await prisma.$transaction(async (tx) => {
      const exit = await exits.writeMembershipExit(tx, before, {
        status: "REMOVED",
        resignationDateReceived: null,
        resignationMethod: null,
        removalReason: "OTHER",
        removalNotes: null,
        letter: "detach",
      });
      // P2025 is not an SQL error: the transaction can keep going.
      const count = await tx.committeeMembership.count({
        where: { id: membershipId, status: "RESIGNED" },
      });
      return { exit, count };
    });

    expect(result).toEqual({ exit: { kind: "changed" }, count: 1 });
  });

  it("rejecting clears the report and the four exit fields, leaving the member ACTIVE", async () => {
    const reportedAt = await fileReport(LETTER);
    const state = await readState();
    expect(
      await prisma.$transaction((tx) =>
        exits.clearRejectedExitReport(tx, state, new Date(0)),
      ),
    ).toEqual({ kind: "changed" });
    expect(
      await prisma.$transaction((tx) =>
        exits.clearRejectedExitReport(tx, state, reportedAt!),
      ),
    ).toEqual({ kind: "cleared", detachedLetter: LETTER });
    expect(await readState()).toMatchObject({
      status: "ACTIVE",
      seatNumber: 1,
      exitReportedAt: null,
      exitReportedKind: null,
      removalReason: null,
      removalNotes: null,
      resignationDateReceived: null,
      resignationMethod: null,
      resignationLetterKey: null,
    });
  });

  // --- Resignation Letters (ticket 08) ---------------------------------------

  const letterColumns = {
    resignationLetterKey: LETTER.key,
    resignationLetterContentType: LETTER.contentType,
    resignationLetterFileName: LETTER.fileName,
  };

  it("refuses a letter on an ACTIVE row without a resignation report", async () => {
    await expect(
      prisma.committeeMembership.update({
        where: { id: membershipId },
        data: letterColumns,
      }),
    ).rejects.toThrow(/CommitteeMembership_resignation_letter_only_on_resignation/);
  });

  it("refuses a letter on a removal report and on a REMOVED row", async () => {
    await prisma.committeeMembership.update({
      where: { id: membershipId },
      data: { exitReportedAt: new Date(), exitReportedKind: "REMOVAL" },
    });
    await expect(
      prisma.committeeMembership.update({
        where: { id: membershipId },
        data: letterColumns,
      }),
    ).rejects.toThrow(/CommitteeMembership_resignation_letter_only_on_resignation/);
    await expect(
      prisma.committeeMembership.update({
        where: { id: membershipId },
        data: {
          status: "REMOVED",
          exitReportedAt: null,
          exitReportedKind: null,
          ...letterColumns,
        },
      }),
    ).rejects.toThrow(/CommitteeMembership_resignation_letter_only_on_resignation/);
  });

  it("refuses a letter key without its content type and file name", async () => {
    await prisma.committeeMembership.update({
      where: { id: membershipId },
      data: { status: "RESIGNED" },
    });
    await expect(
      prisma.committeeMembership.update({
        where: { id: membershipId },
        data: { resignationLetterKey: LETTER.key },
      }),
    ).rejects.toThrow(/CommitteeMembership_resignation_letter_fields_together/);
  });

  it("keeps the reported letter on confirm, as the recorded one", async () => {
    await fileReport(LETTER);
    const state = await readState();
    const result = await prisma.$transaction((tx) =>
      exits.writeMembershipExit(
        tx,
        state,
        {
          status: "RESIGNED",
          resignationDateReceived: state.resignationDateReceived,
          resignationMethod: state.resignationMethod,
          removalReason: null,
          removalNotes: null,
          letter: "keep",
        },
        { expectedExitReportedAt: state.exitReportedAt! },
      ),
    );
    expect(result).toMatchObject({ kind: "written", detachedLetter: null, letter: LETTER });
    expect(await readState()).toMatchObject({ status: "RESIGNED", ...letterColumns });
  });

  it("detaches a pending letter on a superseding removal, even after a stale read", async () => {
    const before = await readState(); // no report, no letter yet
    await fileReport(LETTER);
    const result = await prisma.$transaction((tx) =>
      exits.writeMembershipExit(tx, before, {
        status: "REMOVED",
        resignationDateReceived: null,
        resignationMethod: null,
        removalReason: "OTHER",
        removalNotes: null,
        letter: "detach",
      }),
    );
    // The lock-and-reread found the letter the stale read didn't have.
    expect(result).toMatchObject({ kind: "written", detachedLetter: LETTER, letter: null });
    expect(await readState()).toMatchObject({
      status: "REMOVED",
      resignationLetterKey: null,
      resignationLetterContentType: null,
      resignationLetterFileName: null,
    });
  });

  it("replaces a pending letter with the Admin's upload, detaching the old one", async () => {
    await fileReport(LETTER);
    const state = await readState();
    const upload = { ...LETTER, key: "resignation-letters/m/admin.png", contentType: "image/png" as const, fileName: "admin.png" };
    const result = await prisma.$transaction((tx) =>
      exits.writeMembershipExit(tx, state, {
        status: "RESIGNED",
        resignationDateReceived: new Date("2026-11-01"),
        resignationMethod: "MAIL",
        removalReason: null,
        removalNotes: null,
        letter: upload,
      }),
    );
    expect(result).toMatchObject({ kind: "written", detachedLetter: LETTER, letter: upload });
    expect(await readState()).toMatchObject({ resignationLetterKey: upload.key });
  });

  it("attaches a late letter only while the row is RESIGNED with the letter read", async () => {
    await prisma.committeeMembership.update({
      where: { id: membershipId },
      data: { status: "RESIGNED" },
    });
    const state = await readState();
    expect(
      await prisma.$transaction((tx) => exits.attachRecordedLetter(tx, state, LETTER)),
    ).toBe(true);
    // A second attach from the same (now stale) read is refused.
    expect(
      await prisma.$transaction((tx) => exits.attachRecordedLetter(tx, state, LETTER)),
    ).toBe(false);
    expect(await readState()).toMatchObject(letterColumns);
  });
});
