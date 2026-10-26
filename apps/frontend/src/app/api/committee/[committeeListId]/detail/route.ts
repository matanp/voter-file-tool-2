/**
 * Committee detail read model — GET /api/committee/[committeeListId]/detail
 *
 * One call returns everything the workspace detail pane shows for a
 * committee in the active term: identity (id + composite key + term + AD),
 * the grid rollup, seat rows, the designation-weight summary, pending
 * submissions, Admin-only petition context, and recent membership history.
 * Read-only. See docs/SRS/COMMITTEES_WORKSPACE_UI_IMPLEMENTATION_PLAN.md §5
 * "Detail" and .scratch/committees-workspace/history-inventory.md.
 *
 * Scope (SRS 3.1): unknown id or a committee outside the active term → 404;
 * a Leader whose jurisdictions do not cover the committee → 403 (the
 * convention `fetchCommitteeList` and `designationWeight` already follow).
 *
 * PII: contact (email/phone, including `submissionMetadata` contact), free
 * text notes, eligibility warnings, submitter identity and audit actor names
 * are Admin-only. Decided from `session.user.privilegeLevel`, never from
 * client state.
 */

import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import { findCommitteeAssemblyDistrict } from "@voter-file-tool/shared-prisma";
import prisma from "~/lib/prisma";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import {
  PENDING_MEMBERSHIP_STATUS,
  getActiveTermId,
  getGovernanceConfig,
} from "~/app/api/lib/committeeValidation";
import {
  activeCommitteeInclude,
  buildDesignationWeightSummary,
  canAccessCommittee,
} from "~/app/api/lib/committeeRead";
import { buildSeatRosterRows } from "~/app/api/committee/roster/buildSeatRosterRows";
import {
  PETITION_OUTCOME_ORDER,
  PETITION_OUTCOME_VOTER_SELECT,
  petitionOutcomeWhere,
  toPetitionOutcomeContext,
} from "~/app/api/lib/petitionOutcomes";
import {
  loadMembershipHistory,
  type HistoryMembershipRow,
} from "~/app/api/lib/membershipHistory";
import {
  COMMITTEE_DETAIL_HISTORY_LIMIT,
  committeeDetailParamsSchema,
  type CommitteeDetailResponse,
  type PendingMembership,
} from "~/lib/validations/committee";
import { z } from "zod";

const ROUTE_TAG = "committee/detail";

/** Next.js passes `{ params: Promise<...> }` as the handler's second argument. */
async function resolveRouteParams(context: unknown): Promise<unknown> {
  if (typeof context !== "object" || context === null) return undefined;
  if (!("params" in context)) return undefined;
  return await context.params;
}

/** The parts of `submissionMetadata` the pending list reads. */
const pendingSubmissionMetadataSchema = z
  .object({
    removeMemberId: z.string().optional().catch(undefined),
    requestNotes: z.string().optional().catch(undefined),
    email: z.string().optional().catch(undefined),
    phone: z.string().optional().catch(undefined),
    eligibilityWarnings: z.array(z.unknown()).optional().catch(undefined),
  })
  .catch({});

function serializeDecimal(value: { toString(): string } | null): string | null {
  return value == null ? null : value.toString();
}

async function getCommitteeDetail(
  _req: NextRequest,
  session: SessionWithUser,
  ...contextArgs: unknown[]
) {
  const params = committeeDetailParamsSchema.safeParse(
    await resolveRouteParams(contextArgs[0]),
  );
  if (!params.success) {
    const message = params.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const { committeeListId } = params.data;

  try {
    const activeTermId = await getActiveTermId();
    const privilegeLevel =
      session.user.privilegeLevel ?? PrivilegeLevel.ReadAccess;
    const isAdmin =
      privilegeLevel === PrivilegeLevel.Admin ||
      privilegeLevel === PrivilegeLevel.Developer;

    // POLICY: contact and other PII are Admin-only, as in the roster route.
    const includeContact = isAdmin;

    const committee = await prisma.committeeList.findUnique({
      where: { id: committeeListId },
      include: { ...activeCommitteeInclude(activeTermId), term: true },
    });

    // Plan §3.10 — the workspace is fixed to the active term; a committee from
    // another term is not addressable here.
    if (!committee || committee.termId !== activeTermId) {
      return NextResponse.json(
        { error: "Committee not found" },
        { status: 404 },
      );
    }

    // SRS 3.1 — Leader may only read committees in their jurisdictions.
    const allowed = await canAccessCommittee({
      userId: session.user.id,
      privilegeLevel,
      termId: activeTermId,
      committee,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "You do not have access to this committee" },
        { status: 403 },
      );
    }

    const [
      config,
      assemblyDistrict,
      pendingMemberships,
      allMemberships,
      petitionRows,
    ] = await Promise.all([
      getGovernanceConfig(),
      // A fact about the committee, so it's returned whether or not the AD
      // check is on; the drawer's eligible-only filter needs both.
      findCommitteeAssemblyDistrict(prisma, committee),
      prisma.committeeMembership.findMany({
        where: {
          committeeListId,
          termId: activeTermId,
          status: PENDING_MEMBERSHIP_STATUS,
        },
        orderBy: { submittedAt: "asc" },
        include: {
          voterRecord: {
            select: {
              VRCNUM: true,
              firstName: true,
              lastName: true,
              email: true,
              telephone: true,
            },
          },
          submittedBy: { select: { id: true, name: true } },
        },
      }),
      // Every membership row for the committee + term, any status: the
      // history's audit rows key on these ids, and replacement targets /
      // incoming members resolve their names here.
      prisma.committeeMembership.findMany({
        where: { committeeListId, termId: activeTermId },
        select: {
          id: true,
          voterRecordId: true,
          seatNumber: true,
          petitionPrimaryDate: true,
          petitionSeatNumber: true,
          submissionMetadata: true,
          voterRecord: {
            select: { firstName: true, middleInitial: true, lastName: true },
          },
        },
      }),
      isAdmin
        ? prisma.committeeMembership.findMany({
            where: petitionOutcomeWhere({
              committeeListId,
              termId: activeTermId,
            }),
            include: { voterRecord: PETITION_OUTCOME_VOTER_SELECT },
            orderBy: PETITION_OUTCOME_ORDER,
          })
        : Promise.resolve(undefined),
    ]);

    const rollupOptions = {
      termId: activeTermId,
      maxSeatsPerLted: config.maxSeatsPerLted,
    };
    const { rows, edRollups } = buildSeatRosterRows(
      [{ ...committee, pendingCount: pendingMemberships.length }],
      { ...rollupOptions, includeContact },
    );
    const rollup = edRollups[0];
    if (rollup === undefined) {
      throw new Error(
        "buildSeatRosterRows returned no rollup for the committee",
      );
    }

    const memberships: HistoryMembershipRow[] = allMemberships;
    const membershipsByVoterRecordId = new Map(
      memberships.map((m) => [m.voterRecordId, m]),
    );

    const pending: PendingMembership[] = pendingMemberships.map((m) => {
      const meta = pendingSubmissionMetadataSchema.parse(
        m.submissionMetadata ?? {},
      );
      const target = meta.removeMemberId
        ? membershipsByVoterRecordId.get(meta.removeMemberId)
        : undefined;
      return {
        membershipId: m.id,
        voterRecordId: m.voterRecord.VRCNUM,
        firstName: m.voterRecord.firstName ?? "",
        lastName: m.voterRecord.lastName ?? "",
        submittedAt: m.submittedAt.toISOString(),
        isOwnSubmission: m.submittedById === session.user.id,
        replacementFor: target
          ? {
              voterRecordId: target.voterRecordId,
              firstName: target.voterRecord.firstName ?? "",
              lastName: target.voterRecord.lastName ?? "",
            }
          : null,
        ...(isAdmin
          ? {
              submittedBy: m.submittedBy
                ? { id: m.submittedBy.id, name: m.submittedBy.name }
                : undefined,
              requestNotes: meta.requestNotes,
              eligibilityWarnings: meta.eligibilityWarnings,
              contact: {
                email: meta.email ?? m.voterRecord.email,
                phone: meta.phone ?? m.voterRecord.telephone,
              },
            }
          : {}),
      };
    });

    const history = await loadMembershipHistory({
      isAdmin,
      limit: COMMITTEE_DETAIL_HISTORY_LIMIT,
      memberships,
    });

    const response: CommitteeDetailResponse = {
      committee: {
        committeeListId: committee.id,
        cityTown: committee.cityTown,
        legDistrict: committee.legDistrict,
        electionDistrict: committee.electionDistrict,
        termId: committee.termId,
        ltedWeight: serializeDecimal(committee.ltedWeight),
        assemblyDistrict,
      },
      term: {
        id: committee.term.id,
        label: committee.term.label,
        startDate: committee.term.startDate.toISOString(),
        endDate: committee.term.endDate.toISOString(),
      },
      maxSeatsPerLted: config.maxSeatsPerLted,
      requireAssemblyDistrictMatch: config.requireAssemblyDistrictMatch,
      rollup,
      rows,
      designationWeightSummary: buildDesignationWeightSummary(
        committee,
        activeTermId,
      ),
      pending,
      ...(petitionRows !== undefined
        ? { petitionContext: petitionRows.map(toPetitionOutcomeContext) }
        : {}),
      history,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const extra = { committeeListId };
    if (
      error instanceof Error &&
      error.message.startsWith("Data integrity error")
    ) {
      Sentry.captureException(error, { tags: { route: ROUTE_TAG }, extra });
      console.error(`[${ROUTE_TAG}]`, error.message);
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    Sentry.captureException(error, { tags: { route: ROUTE_TAG }, extra });
    console.error(`[${ROUTE_TAG}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Leader, getCommitteeDetail);
