/**
 * SRS 2.6 — Record petition/primary outcome for a seat (Admin-only).
 * Upserts CommitteeMembership rows per candidate and applies status/seat transitions.
 */

import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import {
  recordPetitionOutcomeSchema,
  type RecordPetitionOutcomeData,
} from "~/lib/validations/committee";
import type { Session } from "next-auth";
import { logAuditEvent } from "~/lib/auditLog";

type Outcome = RecordPetitionOutcomeData["candidates"][number]["outcome"];
type CanonicalPetitionStatus = "ACTIVE" | "PETITIONED_LOST" | "PETITIONED_TIE";
type AuditOutcome = "WON" | "UNOPPOSED" | "LOST" | "TIE";

function statusForOutcome(outcome: Outcome): CanonicalPetitionStatus {
  if (outcome === "WON_PRIMARY" || outcome === "UNOPPOSED") return "ACTIVE";
  if (outcome === "LOST_PRIMARY") return "PETITIONED_LOST";
  return "PETITIONED_TIE";
}

function auditOutcomeFor(outcome: Outcome): AuditOutcome {
  if (outcome === "WON_PRIMARY") return "WON";
  if (outcome === "UNOPPOSED") return "UNOPPOSED";
  if (outcome === "LOST_PRIMARY") return "LOST";
  return "TIE";
}

async function recordPetitionOutcomeHandler(req: NextRequest, session: Session) {
  const body = (await req.json()) as unknown;
  const validation = validateRequest(body, recordPetitionOutcomeSchema);

  if (!validation.success) {
    return validation.response;
  }

  const { committeeListId, termId: bodyTermId, seatNumber, primaryDate, candidates } =
    validation.data;

  if (!session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const userRole = session.user.privilegeLevel ?? PrivilegeLevel.Admin;

  try {
    const termId = bodyTermId ?? (await getActiveTermId());

    const seat = await prisma.seat.findUnique({
      where: {
        committeeListId_termId_seatNumber: {
          committeeListId,
          termId,
          seatNumber,
        },
      },
    });

    if (!seat) {
      return NextResponse.json(
        { error: "Seat not found for this committee and term" },
        { status: 404 },
      );
    }

    const winnerCandidate = candidates.find(
      (c) => c.outcome === "WON_PRIMARY" || c.outcome === "UNOPPOSED",
    );
    const candidateIds = new Set(candidates.map((c) => c.voterRecordId));

    if (winnerCandidate) {
      const currentHolder = await prisma.committeeMembership.findFirst({
        where: {
          committeeListId,
          termId,
          status: "ACTIVE",
          seatNumber,
        },
        select: { voterRecordId: true },
      });
      if (
        currentHolder &&
        !candidateIds.has(currentHolder.voterRecordId)
      ) {
        return NextResponse.json(
          {
            error:
              "Seat is already occupied by another member; resolve before recording petition outcome",
          },
          { status: 409 },
        );
      }
    }

    const primaryDateObj = new Date(primaryDate);

    await prisma.$transaction(async (tx) => {
      await tx.seat.update({
        where: { id: seat.id },
        data: { isPetitioned: true },
      });

      const candidateOutcomeAuditRows: Array<{
        membershipId: string;
        candidateVoterRecordId: string;
        seatNumber: number;
        outcome: AuditOutcome;
        voteCount: number | null;
        resultingStatus: CanonicalPetitionStatus;
        activated: boolean;
        exclusionReason: "lost_primary" | "tie_primary" | null;
      }> = [];

      for (const c of candidates) {
        const status = statusForOutcome(c.outcome);
        const isWinner = status === "ACTIVE";
        const finalSeatNumber = isWinner ? seatNumber : null;
        const activatedAt = isWinner ? new Date() : null;
        const outcome = auditOutcomeFor(c.outcome);
        const exclusionReason =
          status === "PETITIONED_LOST"
            ? "lost_primary"
            : status === "PETITIONED_TIE"
              ? "tie_primary"
              : null;
        const afterMembershipState = { status, seatNumber: finalSeatNumber };

        const existing = await tx.committeeMembership.findUnique({
          where: {
            voterRecordId_committeeListId_termId: {
              voterRecordId: c.voterRecordId,
              committeeListId,
              termId,
            },
          },
        });

        const baseData = {
          membershipType: "PETITIONED" as const,
          petitionSeatNumber: seatNumber,
          petitionPrimaryDate: primaryDateObj,
          petitionVoteCount: c.voteCount ?? null,
          status,
          seatNumber: finalSeatNumber,
          activatedAt,
        };

        if (existing) {
          const beforeStatus = existing.status;
          const beforeMembershipState = {
            status: existing.status,
            seatNumber: existing.seatNumber,
          };
          await tx.committeeMembership.update({
            where: { id: existing.id },
            data: baseData,
          });
          await logAuditEvent(
            userId,
            userRole,
            "PETITION_RECORDED",
            "CommitteeMembership",
            existing.id,
            beforeMembershipState,
            afterMembershipState,
            {
              source: "petition_outcome",
              committeeListId,
              termId,
              candidateVoterRecordId: c.voterRecordId,
              seatNumber,
              outcome,
              voteCount: c.voteCount ?? null,
              resultingStatus: status,
              activated: isWinner,
              exclusionReason,
            },
            tx,
          );
          candidateOutcomeAuditRows.push({
            membershipId: existing.id,
            candidateVoterRecordId: c.voterRecordId,
            seatNumber,
            outcome,
            voteCount: c.voteCount ?? null,
            resultingStatus: status,
            activated: isWinner,
            exclusionReason,
          });
          if (isWinner && beforeStatus !== "ACTIVE") {
            await logAuditEvent(
              userId,
              userRole,
              "MEMBER_ACTIVATED",
              "CommitteeMembership",
              existing.id,
              { status: beforeStatus },
              { status: "ACTIVE", seatNumber: finalSeatNumber },
              {
                source: "petition_outcome",
                candidateVoterRecordId: c.voterRecordId,
                petitionSeatNumber: seatNumber,
                petitionOutcome: outcome,
                petitionVoteCount: c.voteCount ?? null,
              },
              tx,
            );
          }
        } else {
          const created = await tx.committeeMembership.create({
            data: {
              voterRecordId: c.voterRecordId,
              committeeListId,
              termId,
              ...baseData,
            },
          });
          await logAuditEvent(
            userId,
            userRole,
            "PETITION_RECORDED",
            "CommitteeMembership",
            created.id,
            null,
            afterMembershipState,
            {
              source: "petition_outcome",
              committeeListId,
              termId,
              candidateVoterRecordId: c.voterRecordId,
              seatNumber,
              outcome,
              voteCount: c.voteCount ?? null,
              resultingStatus: status,
              activated: isWinner,
              exclusionReason,
            },
            tx,
          );
          candidateOutcomeAuditRows.push({
            membershipId: created.id,
            candidateVoterRecordId: c.voterRecordId,
            seatNumber,
            outcome,
            voteCount: c.voteCount ?? null,
            resultingStatus: status,
            activated: isWinner,
            exclusionReason,
          });
          if (isWinner) {
            await logAuditEvent(
              userId,
              userRole,
              "MEMBER_ACTIVATED",
              "CommitteeMembership",
              created.id,
              null,
              { status: "ACTIVE", seatNumber: finalSeatNumber },
              {
                source: "petition_outcome",
                candidateVoterRecordId: c.voterRecordId,
                petitionSeatNumber: seatNumber,
                petitionOutcome: outcome,
                petitionVoteCount: c.voteCount ?? null,
              },
              tx,
            );
          }
        }
      }

      await logAuditEvent(
        userId,
        userRole,
        "PETITION_RECORDED",
        "Seat",
        seat.id,
        null,
        null,
        {
          committeeListId,
          termId,
          seatNumber,
          primaryDate: primaryDate,
          candidateOutcomes: candidateOutcomeAuditRows,
          candidateCount: candidateOutcomeAuditRows.length,
        },
        tx,
      );
    });

    return NextResponse.json(
      { message: "Petition outcome recorded", seatNumber },
      { status: 200 },
    );
  } catch (error) {
    console.error("Record petition outcome error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, recordPetitionOutcomeHandler);
