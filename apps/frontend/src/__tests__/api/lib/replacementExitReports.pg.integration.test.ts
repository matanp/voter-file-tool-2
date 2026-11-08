/**
 * PostgreSQL-backed proof of the replacement pairing (leader-feedback-2026-11
 * ticket 09): the CHECK constraint on `replacementMembershipId`, the helpers
 * that clear it with the report, accepting and rejecting a paired candidate,
 * and the migration's data step that moves pending replacements off
 * `submissionMetadata.removeMemberId`.
 *
 * Needs a database built by `prisma migrate deploy`. Run with
 * `pnpm --filter voter-file-tool test:pg`; skips without a local test URL.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrivilegeLevel, type Prisma, type PrismaClient } from "@prisma/client";
import type * as MembershipExit from "~/app/api/lib/membershipExit";
import type * as MembershipConfirmation from "~/app/api/lib/membershipConfirmation";

const canRunPg = Boolean(process.env.POSTGRES_PRISMA_URL_TEST);
if (!canRunPg) {
  console.warn(
    "Skipping PostgreSQL integration tests: set POSTGRES_PRISMA_URL_TEST, or use a localhost POSTGRES_PRISMA_URL",
  );
}
const describePg = canRunPg ? describe : describe.skip;

const TERM_ID = "pg-repl-term";
const LEADER_ID = "pg-repl-leader";
const ADMIN_ID = "pg-repl-admin";
const ACTOR = { userId: ADMIN_ID, userRole: PrivilegeLevel.Admin };

const MIGRATION = path.join(
  __dirname,
  "../../../../prisma/migrations/20261108000000_replacements_use_exit_reports/migration.sql",
);

/** The migration's data statements (everything after the DDL), in order. */
function migrationDataStatements(): string[] {
  const sql = readFileSync(MIGRATION, "utf8");
  const start = sql.indexOf("-- Data: move pending replacements");
  if (start < 0) throw new Error("migration data marker not found");
  return sql
    .slice(start)
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

describePg("Replacements paired with Exit Reports (PostgreSQL)", () => {
  let prisma: PrismaClient;
  let exits: typeof MembershipExit;
  let confirmation: typeof MembershipConfirmation;
  let committeeListId: number;
  let meetingRecordId: string;

  beforeAll(async () => {
    prisma = (await import("~/lib/prisma")).default;
    exits = await import("~/app/api/lib/membershipExit");
    confirmation = await import("~/app/api/lib/membershipConfirmation");
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "AuditLog", "CommitteeMembership", "MeetingRecord", "Seat", "CommitteeList", "CommitteeTerm", "VoterRecord", "User" CASCADE`,
    );
    await prisma.user.createMany({
      data: [
        { id: LEADER_ID, email: "leader@example.org", privilegeLevel: PrivilegeLevel.Leader },
        { id: ADMIN_ID, email: "admin@example.org", privilegeLevel: PrivilegeLevel.Admin },
      ],
    });
    await prisma.committeeTerm.create({
      data: {
        id: TERM_ID,
        label: "PG replacement term",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2028-12-31"),
        isActive: true,
      },
    });
    const committee = await prisma.committeeList.create({
      data: {
        cityTown: "PG REPL TOWN",
        legDistrict: 1,
        electionDistrict: 1,
        termId: TERM_ID,
      },
    });
    committeeListId = committee.id;
    meetingRecordId = (
      await prisma.meetingRecord.create({
        data: { meetingDate: new Date("2026-11-05"), createdById: ADMIN_ID },
      })
    ).id;
  });

  let voterCount = 0;
  async function member(
    data: Omit<Prisma.CommitteeMembershipUncheckedCreateInput, "voterRecordId" | "committeeListId" | "termId"> & {
      voter?: string;
    },
  ) {
    const { voter, ...rest } = data;
    voterCount += 1;
    const VRCNUM = voter ?? `PGREPL${voterCount}`;
    await prisma.voterRecord.upsert({
      where: { VRCNUM },
      create: { VRCNUM, latestRecordEntryYear: 2026, latestRecordEntryNumber: 1 },
      update: {},
    });
    return prisma.committeeMembership.create({
      data: { voterRecordId: VRCNUM, committeeListId, termId: TERM_ID, ...rest },
    });
  }

  const read = (id: string) =>
    prisma.committeeMembership.findUniqueOrThrow({ where: { id } });

  const REPORT = {
    kind: "REMOVAL" as const,
    reportedById: LEADER_ID,
    resignationDateReceived: null,
    resignationMethod: null,
    removalReason: "MOVED_OUT_OF_DISTRICT" as const,
    removalNotes: "Moved to Ohio",
  };

  async function pairedReplacement() {
    const outgoing = await member({ status: "ACTIVE", seatNumber: 1, membershipType: "PETITIONED" });
    const candidate = await member({ status: "SUBMITTED", submittedById: LEADER_ID });
    const reportedAt = await prisma.$transaction((tx) =>
      exits.fileExitReport(tx, outgoing.id, REPORT, {
        replacementMembershipId: candidate.id,
      }),
    );
    expect(reportedAt).not.toBeNull();
    return { outgoing, candidate, reportedAt: reportedAt! };
  }

  describe("the CHECK constraint and the helpers", () => {
    it("refuses a pairing on a row without a pending report", async () => {
      const outgoing = await member({ status: "ACTIVE" });
      const candidate = await member({ status: "SUBMITTED" });
      await expect(
        prisma.committeeMembership.update({
          where: { id: outgoing.id },
          data: { replacementMembershipId: candidate.id },
        }),
      ).rejects.toThrow(/CommitteeMembership_replacement_only_with_exit_report/);
    });

    it("refuses two outgoing members paired with one candidate", async () => {
      const { candidate } = await pairedReplacement();
      const other = await member({ status: "ACTIVE", seatNumber: 2 });
      await expect(
        prisma.$transaction((tx) =>
          exits.fileExitReport(tx, other.id, REPORT, {
            replacementMembershipId: candidate.id,
          }),
        ),
      ).rejects.toThrow(/Unique constraint/);
    });

    it("clears the pairing with the report on an exit and on a rejection", async () => {
      const first = await pairedReplacement();
      await prisma.$transaction((tx) =>
        exits.writeMembershipExit(tx, first.outgoing, {
          status: "REMOVED",
          resignationDateReceived: null,
          resignationMethod: null,
          removalReason: "OTHER",
          removalNotes: null,
        }),
      );
      expect(await read(first.outgoing.id)).toMatchObject({
        status: "REMOVED",
        replacementMembershipId: null,
      });

      const second = await pairedReplacement();
      expect(
        await prisma.$transaction((tx) =>
          exits.clearRejectedExitReport(tx, second.outgoing.id, second.reportedAt),
        ),
      ).toBe(true);
      expect(await read(second.outgoing.id)).toMatchObject({
        status: "ACTIVE",
        exitReportedAt: null,
        replacementMembershipId: null,
      });
    });

    it("pairs with a pending report as it is, or rewrites it with a new instant", async () => {
      const outgoing = await member({ status: "ACTIVE", seatNumber: 1 });
      const reportedAt = await prisma.$transaction((tx) =>
        exits.fileExitReport(tx, outgoing.id, REPORT),
      );
      const candidate = await member({ status: "SUBMITTED" });

      // A stale instant is refused.
      expect(
        await prisma.$transaction((tx) =>
          exits.pairExitReportWithReplacement(tx, outgoing.id, new Date(0), candidate.id),
        ),
      ).toBeNull();

      const rewrittenAt = await prisma.$transaction((tx) =>
        exits.pairExitReportWithReplacement(tx, outgoing.id, reportedAt!, candidate.id, {
          ...REPORT,
          kind: "RESIGNATION",
          resignationDateReceived: new Date("2026-10-28"),
          resignationMethod: "MAIL",
          removalReason: null,
          removalNotes: null,
        }),
      );
      expect(rewrittenAt).not.toBeNull();
      expect(rewrittenAt!.getTime()).not.toBe(reportedAt!.getTime());
      expect(await read(outgoing.id)).toMatchObject({
        exitReportedKind: "RESIGNATION",
        resignationMethod: "MAIL",
        removalReason: null,
        removalNotes: null,
        replacementMembershipId: candidate.id,
      });

      // Already paired: a second pairing is refused.
      const another = await member({ status: "SUBMITTED" });
      expect(
        await prisma.$transaction((tx) =>
          exits.pairExitReportWithReplacement(tx, outgoing.id, rewrittenAt!, another.id),
        ),
      ).toBeNull();
    });
  });

  describe("accepting and rejecting the candidate", () => {
    it("accepting records the reported exit and seats the candidate in one transaction", async () => {
      const { outgoing, candidate } = await pairedReplacement();

      const result = await prisma.$transaction((tx) =>
        confirmation.confirmSubmittedMembership(tx, {
          membershipId: candidate.id,
          meetingRecordId,
          actor: ACTOR,
          maxSeats: 1,
          membershipType: "APPOINTED",
        }),
      );

      expect(result).toEqual({ kind: "accepted" });
      expect(await read(outgoing.id)).toMatchObject({
        status: "REMOVED",
        removalReason: "MOVED_OUT_OF_DISTRICT",
        removalNotes: "Moved to Ohio",
        seatNumber: null,
        exitReportedAt: null,
        replacementMembershipId: null,
      });
      expect(await read(candidate.id)).toMatchObject({ status: "ACTIVE", seatNumber: 1 });
      const removedAudit = await prisma.auditLog.findFirstOrThrow({
        where: { entityId: outgoing.id, action: "MEMBER_REMOVED" },
      });
      expect(removedAudit.metadata).toMatchObject({
        reason: "replacement",
        replacementMembershipId: candidate.id,
        reportedById: LEADER_ID,
      });
    });

    it("rejecting the candidate rejects the paired report and leaves the member", async () => {
      const { outgoing, candidate } = await pairedReplacement();

      const result = await prisma.$transaction((tx) =>
        confirmation.rejectSubmittedMembership(tx, {
          membershipId: candidate.id,
          actor: ACTOR,
        }),
      );

      expect(result).toEqual({ kind: "rejected" });
      expect(await read(outgoing.id)).toMatchObject({
        status: "ACTIVE",
        seatNumber: 1,
        exitReportedAt: null,
        removalReason: null,
        removalNotes: null,
        replacementMembershipId: null,
      });
      expect(
        await prisma.auditLog.count({
          where: { entityId: outgoing.id, action: "MEMBER_EXIT_REPORT_REJECTED" },
        }),
      ).toBe(1);
    });
  });

  describe("the migration's data step", () => {
    const runMigrationData = () =>
      prisma.$transaction(async (tx) => {
        for (const statement of migrationDataStatements()) {
          await tx.$executeRawUnsafe(statement);
        }
      });

    it("moves pending replacements onto Exit Reports, covering the edge cases", async () => {
      // 1. A plain pending replacement: the outgoing member gets the report
      //    acceptance used to record.
      const out1 = await member({ voter: "OUT1", status: "ACTIVE", seatNumber: 1 });
      const cand1 = await member({
        voter: "CAND1",
        status: "SUBMITTED",
        submittedById: LEADER_ID,
        submittedAt: new Date("2026-09-01T10:00:00.000Z"),
        submissionMetadata: { removeMemberId: " OUT1 ", requestNotes: "Keep me" },
      });
      // 2. The outgoing member already has a standalone report: pair, don't overwrite.
      const out2 = await member({ voter: "OUT2", status: "ACTIVE", seatNumber: 2 });
      const out2ReportedAt = await prisma.$transaction((tx) =>
        exits.fileExitReport(tx, out2.id, { ...REPORT, removalReason: "DECEASED", removalNotes: null }),
      );
      const cand2 = await member({
        voter: "CAND2",
        status: "SUBMITTED",
        submissionMetadata: { removeMemberId: "OUT2" },
      });
      // 3. The named member is no longer ACTIVE: a plain add.
      const out3 = await member({ voter: "OUT3", status: "REMOVED" });
      const cand3 = await member({
        voter: "CAND3",
        status: "SUBMITTED",
        submissionMetadata: { removeMemberId: "OUT3", requestNotes: "n" },
      });
      // 4. Two candidates name the same member: the earlier one is paired.
      const out4 = await member({ voter: "OUT4", status: "ACTIVE", seatNumber: 3 });
      const cand4a = await member({
        voter: "CAND4A",
        status: "SUBMITTED",
        submittedAt: new Date("2026-09-01T00:00:00.000Z"),
        submissionMetadata: { removeMemberId: "OUT4" },
      });
      const cand4b = await member({
        voter: "CAND4B",
        status: "SUBMITTED",
        submittedAt: new Date("2026-09-02T00:00:00.000Z"),
        submissionMetadata: { removeMemberId: "OUT4" },
      });
      // 5. A decided submission keeps its metadata; its latest submission
      //    audit row gets the outgoing member for History.
      const cand5 = await member({
        voter: "CAND5",
        status: "ACTIVE",
        seatNumber: 4,
        submissionMetadata: { removeMemberId: "OUT1" },
      });
      await prisma.auditLog.createMany({
        data: [
          {
            id: "audit-cand1",
            userId: LEADER_ID,
            userRole: PrivilegeLevel.Leader,
            action: "MEMBER_SUBMITTED",
            entityType: "CommitteeMembership",
            entityId: cand1.id,
            metadata: { subject: { memberName: "Cand One" } },
          },
          {
            id: "audit-cand5-old",
            userId: LEADER_ID,
            userRole: PrivilegeLevel.Leader,
            action: "MEMBER_SUBMITTED",
            entityType: "CommitteeMembership",
            entityId: cand5.id,
            timestamp: new Date("2026-01-01T00:00:00.000Z"),
          },
          {
            id: "audit-cand5-new",
            userId: LEADER_ID,
            userRole: PrivilegeLevel.Leader,
            action: "MEMBER_SUBMITTED",
            entityType: "CommitteeMembership",
            entityId: cand5.id,
            timestamp: new Date("2026-02-01T00:00:00.000Z"),
          },
        ],
      });

      await runMigrationData();

      expect(await read(out1.id)).toMatchObject({
        status: "ACTIVE",
        exitReportedAt: new Date("2026-09-01T10:00:00.000Z"),
        exitReportedById: LEADER_ID,
        exitReportedKind: "REMOVAL",
        removalReason: "OTHER",
        removalNotes: null,
        replacementMembershipId: cand1.id,
      });
      expect((await read(cand1.id)).submissionMetadata).toEqual({ requestNotes: "Keep me" });

      expect(await read(out2.id)).toMatchObject({
        exitReportedAt: out2ReportedAt,
        removalReason: "DECEASED",
        replacementMembershipId: cand2.id,
      });
      expect((await read(cand2.id)).submissionMetadata).toEqual({});

      expect(await read(out3.id)).toMatchObject({ status: "REMOVED", exitReportedAt: null });
      expect((await read(cand3.id)).submissionMetadata).toEqual({ requestNotes: "n" });
      expect(
        await prisma.committeeMembership.count({
          where: { replacementMembershipId: cand3.id },
        }),
      ).toBe(0);

      expect((await read(out4.id)).replacementMembershipId).toBe(cand4a.id);
      expect(
        await prisma.committeeMembership.count({
          where: { replacementMembershipId: cand4b.id },
        }),
      ).toBe(0);
      expect((await read(cand4b.id)).submissionMetadata).toEqual({});

      expect((await read(cand5.id)).submissionMetadata).toEqual({ removeMemberId: "OUT1" });
      const audits = await prisma.auditLog.findMany({ orderBy: { id: "asc" } });
      const metadataOf = (id: string) => audits.find((a) => a.id === id)?.metadata;
      expect(metadataOf("audit-cand1")).toEqual({
        subject: { memberName: "Cand One" },
        removeMemberId: "OUT1",
      });
      expect(metadataOf("audit-cand5-new")).toEqual({ removeMemberId: "OUT1" });
      expect(metadataOf("audit-cand5-old")).toBeNull();

      // No submissionMetadata.removeMemberId is left on a pending row.
      const leftovers = await prisma.$queryRaw<Array<{ n: bigint }>>`
        SELECT COUNT(*)::bigint AS n FROM "CommitteeMembership"
        WHERE "status" = 'SUBMITTED' AND "submissionMetadata" ? 'removeMemberId'
      `;
      expect(Number(leftovers[0]?.n)).toBe(0);
    });

    it("leaves a migrated replacement acceptable exactly as before: REMOVED, Other", async () => {
      const out = await member({ voter: "OUTM", status: "ACTIVE", seatNumber: 1 });
      const cand = await member({
        voter: "CANDM",
        status: "SUBMITTED",
        submittedById: LEADER_ID,
        submissionMetadata: { removeMemberId: "OUTM" },
      });
      await runMigrationData();

      const result = await prisma.$transaction((tx) =>
        confirmation.confirmSubmittedMembership(tx, {
          membershipId: cand.id,
          meetingRecordId,
          actor: ACTOR,
          maxSeats: 1,
          membershipType: "APPOINTED",
        }),
      );

      expect(result).toEqual({ kind: "accepted" });
      expect(await read(out.id)).toMatchObject({
        status: "REMOVED",
        removalReason: "OTHER",
        seatNumber: null,
      });
      expect(await read(cand.id)).toMatchObject({ status: "ACTIVE" });
    });
  });
});
