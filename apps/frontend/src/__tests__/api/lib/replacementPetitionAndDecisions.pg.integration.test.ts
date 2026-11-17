/**
 * PostgreSQL-backed proof of two PR 145 review fixes (ticket 09):
 * - a paired replacement candidate who loses or ties a petition is unpaired,
 *   leaving the outgoing member's Exit Report pending on its own;
 * - a meeting batch runs each decision in a savepoint, so one item whose
 *   paired report changed, or whose activation hits the one-active-per-term
 *   index (a P2002 from Postgres, which without a savepoint aborts the whole
 *   transaction), fails alone, its writes undone, and the rest commit.
 *
 * Needs a database built by `prisma migrate deploy`. Run with
 * `pnpm --filter voter-file-tool test:pg`; skips without a local test URL.
 */
import { PrivilegeLevel, type Prisma, type PrismaClient } from "@prisma/client";
import type { NextRequest } from "next/server";
import type * as MembershipExit from "~/app/api/lib/membershipExit";
import type * as Savepoint from "~/app/api/lib/savepoint";
import type * as CommitteeValidation from "~/app/api/lib/committeeValidation";
import type * as Eligibility from "~/lib/eligibility";
import type { POST as PetitionPost } from "~/app/api/admin/petition-outcomes/record/route";
import type { POST as DecisionsPost } from "~/app/api/admin/meetings/[meetingId]/decisions/route";
import { MEMBER_CHANGED_MESSAGE } from "~/app/api/lib/exitReportAccess";
import { ALREADY_IN_ANOTHER_COMMITTEE_ERROR } from "~/app/api/lib/committeeValidation";

const ADMIN_ID = "pg-pd-admin";
const LEADER_ID = "pg-pd-leader";

jest.mock("~/auth", () => ({
  auth: jest.fn().mockResolvedValue({
    user: { id: "pg-pd-admin", privilegeLevel: "Admin" },
  }),
}));

// Wraps the real helper so a test can stand in for a concurrent change to the
// paired report (the conditional clear finding the row changed).
jest.mock("~/app/api/lib/membershipExit", () => {
  const actual = jest.requireActual<typeof MembershipExit>(
    "~/app/api/lib/membershipExit",
  );
  return { ...actual, rejectExitReport: jest.fn(actual.rejectExitReport) };
});

// Wraps the real check so a test can stand in for a concurrent activation
// that commits between the check and the write.
jest.mock("~/app/api/lib/committeeValidation", () => {
  const actual = jest.requireActual<typeof CommitteeValidation>(
    "~/app/api/lib/committeeValidation",
  );
  return {
    ...actual,
    isVoterActiveInAnotherCommittee: jest.fn(actual.isVoterActiveInAnotherCommittee),
  };
});

// Voter-file eligibility (party, district, import recency) isn't under test.
jest.mock("~/lib/eligibility", () => {
  const actual = jest.requireActual<typeof Eligibility>("~/lib/eligibility");
  return {
    ...actual,
    validateEligibility: jest.fn(async () => ({ eligible: true, hardStops: [], warnings: [] })),
  };
});

const canRunPg = Boolean(process.env.POSTGRES_PRISMA_URL_TEST);
if (!canRunPg) {
  console.warn(
    "Skipping PostgreSQL integration tests: set POSTGRES_PRISMA_URL_TEST, or use a localhost POSTGRES_PRISMA_URL",
  );
}
const describePg = canRunPg ? describe : describe.skip;

const TERM_ID = "pg-pd-term";

/** A request whose only body is JSON (the routes read nothing else). */
function jsonRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

describePg("Replacement pairing across petitions and meeting batches (PostgreSQL)", () => {
  let prisma: PrismaClient;
  let exits: typeof MembershipExit;
  let validation: typeof CommitteeValidation;
  let savepoint: typeof Savepoint;
  let petitionPost: typeof PetitionPost;
  let decisionsPost: typeof DecisionsPost;
  let committeeListId: number;
  let meetingRecordId: string;

  beforeAll(async () => {
    prisma = (await import("~/lib/prisma")).default;
    exits = await import("~/app/api/lib/membershipExit");
    validation = await import("~/app/api/lib/committeeValidation");
    savepoint = await import("~/app/api/lib/savepoint");
    ({ POST: petitionPost } = await import(
      "~/app/api/admin/petition-outcomes/record/route"
    ));
    ({ POST: decisionsPost } = await import(
      "~/app/api/admin/meetings/[meetingId]/decisions/route"
    ));
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  beforeEach(async () => {
    jest.mocked(exits.rejectExitReport).mockClear();
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "AuditLog", "CommitteeMembership", "MeetingRecord", "Seat", "CommitteeList", "CommitteeTerm", "CommitteeGovernanceConfig", "VoterRecord", "User" CASCADE`,
    );
    await prisma.user.createMany({
      data: [
        { id: LEADER_ID, email: "pd-leader@example.org", privilegeLevel: PrivilegeLevel.Leader },
        { id: ADMIN_ID, email: "pd-admin@example.org", privilegeLevel: PrivilegeLevel.Admin },
      ],
    });
    await prisma.committeeGovernanceConfig.create({
      data: { id: "pg-pd-governance", requiredPartyCode: "DEM", maxSeatsPerLted: 4 },
    });
    await prisma.committeeTerm.create({
      data: {
        id: TERM_ID,
        label: "PG petition/decisions term",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2028-12-31"),
        isActive: true,
      },
    });
    committeeListId = (
      await prisma.committeeList.create({
        data: { cityTown: "PG PD TOWN", legDistrict: 1, electionDistrict: 1, termId: TERM_ID },
      })
    ).id;
    await prisma.seat.createMany({
      data: [1, 2, 3, 4].map((seatNumber) => ({ committeeListId, termId: TERM_ID, seatNumber })),
    });
    meetingRecordId = (
      await prisma.meetingRecord.create({
        data: { meetingDate: new Date("2026-11-05"), createdById: ADMIN_ID },
      })
    ).id;
  });

  let voterCount = 0;
  async function member(
    data: Omit<Prisma.CommitteeMembershipUncheckedCreateInput, "voterRecordId" | "committeeListId" | "termId">,
  ) {
    voterCount += 1;
    const VRCNUM = `PGPD${voterCount}`;
    await prisma.voterRecord.create({
      data: { VRCNUM, latestRecordEntryYear: 2026, latestRecordEntryNumber: 1 },
    });
    return prisma.committeeMembership.create({
      data: { voterRecordId: VRCNUM, committeeListId, termId: TERM_ID, ...data },
    });
  }

  const read = (id: string) =>
    prisma.committeeMembership.findUniqueOrThrow({ where: { id } });

  async function pairedReplacement(seatNumber: number) {
    const outgoing = await member({ status: "ACTIVE", seatNumber });
    const candidate = await member({ status: "SUBMITTED", submittedById: LEADER_ID });
    const reportedAt = await prisma.$transaction((tx) =>
      exits.fileExitReport(
        tx,
        outgoing.id,
        {
          kind: "REMOVAL",
          reportedById: LEADER_ID,
          resignationDateReceived: null,
          resignationMethod: null,
          removalReason: "MOVED_OUT_OF_DISTRICT",
          removalNotes: "Moved to Ohio",
        },
        { replacementMembershipId: candidate.id },
      ),
    );
    expect(reportedAt).not.toBeNull();
    return { outgoing, candidate, reportedAt: reportedAt! };
  }

  describe("petition outcomes", () => {
    it.each([
      { label: "loses", outcomes: ["WON_PRIMARY", "LOST_PRIMARY"] as const, status: "PETITIONED_LOST" },
      { label: "ties", outcomes: ["TIE", "TIE"] as const, status: "PETITIONED_TIE" },
    ])(
      "unpairs a candidate who $label, leaving the outgoing report pending",
      async ({ outcomes, status }) => {
        const { outgoing, candidate, reportedAt } = await pairedReplacement(1);
        const rival = await member({ status: "SUBMITTED", submittedById: LEADER_ID });

        const response = await petitionPost(
          jsonRequest({
            committeeListId,
            termId: TERM_ID,
            seatNumber: 2,
            primaryDate: "2026-06-23",
            candidates: [
              { voterRecordId: rival.voterRecordId, voteCount: 10, outcome: outcomes[0] },
              { voterRecordId: candidate.voterRecordId, voteCount: outcomes[1] === "TIE" ? 10 : 5, outcome: outcomes[1] },
            ],
          }),
        );

        expect(response.status).toBe(200);
        expect(await read(candidate.id)).toMatchObject({ status });
        expect(await read(outgoing.id)).toMatchObject({
          status: "ACTIVE",
          exitReportedAt: reportedAt,
          replacementMembershipId: null,
        });
      },
    );
  });

  describe("meeting decisions", () => {
    it("fails only the item whose paired report changed, and commits the rest", async () => {
      const paired = await pairedReplacement(1);
      const plain = await member({ status: "SUBMITTED", submittedById: LEADER_ID });
      // The paired report changes between the reject's read and its clear.
      jest.mocked(exits.rejectExitReport).mockResolvedValueOnce(false);

      const response = await decisionsPost(
        jsonRequest({
          decisions: [
            { membershipId: paired.candidate.id, decision: "reject" },
            { membershipId: plain.id, decision: "reject" },
          ],
        }),
        { params: Promise.resolve({ meetingId: meetingRecordId }) },
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        results: [
          {
            membershipId: paired.candidate.id,
            decision: "reject",
            success: false,
            error: MEMBER_CHANGED_MESSAGE,
          },
          { membershipId: plain.id, decision: "reject", success: true },
        ],
      });
      // The failed item's candidate rejection was rolled back to its savepoint.
      expect(await read(paired.candidate.id)).toMatchObject({ status: "SUBMITTED" });
      expect(await read(paired.outgoing.id)).toMatchObject({
        status: "ACTIVE",
        exitReportedAt: paired.reportedAt,
        replacementMembershipId: paired.candidate.id,
      });
      expect(await read(plain.id)).toMatchObject({ status: "REJECTED", meetingRecordId });
      const rejectedAudits = await prisma.auditLog.findMany({
        where: { action: "MEMBER_REJECTED" },
        select: { entityId: true },
      });
      expect(rejectedAudits).toEqual([{ entityId: plain.id }]);
    });

    it("fails only the item that hits the one-active-per-term index, and commits the rest", async () => {
      const raced = await member({ status: "SUBMITTED", submittedById: LEADER_ID });
      const plain = await member({ status: "SUBMITTED", submittedById: LEADER_ID });
      const otherCommitteeId = (
        await prisma.committeeList.create({
          data: { cityTown: "PG PD TOWN", legDistrict: 1, electionDistrict: 2, termId: TERM_ID },
        })
      ).id;
      // Another committee activates the same voter, and commits, after this
      // item's check and before its write: the write raises a real P2002.
      jest
        .mocked(validation.isVoterActiveInAnotherCommittee)
        .mockImplementationOnce(async () => {
          await prisma.committeeMembership.create({
            data: {
              voterRecordId: raced.voterRecordId,
              committeeListId: otherCommitteeId,
              termId: TERM_ID,
              status: "ACTIVE",
            },
          });
          return false;
        });

      const response = await decisionsPost(
        jsonRequest({
          decisions: [
            { membershipId: raced.id, decision: "confirm" },
            { membershipId: plain.id, decision: "confirm" },
          ],
        }),
        { params: Promise.resolve({ meetingId: meetingRecordId }) },
      );

      expect(await response.json()).toEqual({
        results: [
          {
            membershipId: raced.id,
            decision: "confirm",
            success: false,
            error: ALREADY_IN_ANOTHER_COMMITTEE_ERROR,
          },
          { membershipId: plain.id, decision: "confirm", success: true },
        ],
      });
      expect(response.status).toBe(200);
      expect(await read(raced.id)).toMatchObject({ status: "SUBMITTED", seatNumber: null });
      expect(await read(plain.id)).toMatchObject({ status: "ACTIVE", meetingRecordId });
    });

    it("without a savepoint, a caught database error leaves the transaction aborted", async () => {
      const a = await member({ status: "SUBMITTED" });
      // What the batch did before savepoints: catch the P2002 and carry on.
      const batch = prisma.$transaction(async (tx) => {
        await tx.committeeMembership
          .create({
            data: { voterRecordId: a.voterRecordId, committeeListId, termId: TERM_ID, status: "SUBMITTED" },
          })
          .catch(() => undefined);
        await tx.committeeMembership.update({ where: { id: a.id }, data: { rejectionNote: "after" } });
      });

      await expect(batch).rejects.toThrow(/current transaction is aborted/);
      expect(await read(a.id)).toMatchObject({ rejectionNote: null });
    });

    it("keeps the transaction usable after a database error inside a savepoint", async () => {
      const a = await member({ status: "SUBMITTED" });
      const b = await member({ status: "SUBMITTED" });

      await prisma.$transaction(async (tx) => {
        await tx.committeeMembership.update({ where: { id: a.id }, data: { rejectionNote: "kept" } });
        await expect(
          savepoint.withSavepoint(tx, async () => {
            await tx.committeeMembership.update({ where: { id: b.id }, data: { rejectionNote: "undone" } });
            // A unique violation aborts the transaction unless rolled back to the savepoint.
            await tx.committeeMembership.create({
              data: { voterRecordId: a.voterRecordId, committeeListId, termId: TERM_ID, status: "SUBMITTED" },
            });
          }),
        ).rejects.toThrow(/Unique constraint/);
        await tx.committeeMembership.update({ where: { id: b.id }, data: { rejectionNote: "after" } });
      });

      expect(await read(a.id)).toMatchObject({ rejectionNote: "kept" });
      expect(await read(b.id)).toMatchObject({ rejectionNote: "after" });
    });
  });
});
