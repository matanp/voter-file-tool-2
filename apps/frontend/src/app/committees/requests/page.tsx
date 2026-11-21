import React from "react";

import prisma from "~/lib/prisma";
import { hasPermissionFor } from "~/lib/utils";
import {
  type CommitteeList,
  MembershipStatus,
  type Prisma,
  PrivilegeLevel,
  type VoterRecord,
} from "@prisma/client";
import { auth } from "~/auth";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { PageContainer } from "~/components/layout/PageContainer";
import { RequestRow } from "./RequestRow";
import { ExitReportList } from "./ExitReportList";
import { REQUESTS_HEADING_ID } from "./requestsHeading";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import {
  PENDING_EXIT_REPORT_INCLUDE,
  pendingExitReportWhere,
  toPendingExitReport,
} from "~/app/api/lib/pendingExitReports";
import type { PendingExitReport } from "~/lib/validations/committee";

export const dynamic = "force-dynamic";

// Only the name: the row is a Client Component, so the full voter record
// (DOB, address, phone) would be sent to the browser.
const REQUEST_VOTER_SELECT = {
  firstName: true,
  lastName: true,
} as const satisfies Prisma.VoterRecordSelect;
type RequestVoterFields = Pick<VoterRecord, keyof typeof REQUEST_VOTER_SELECT>;

// Passed to a Client Component, so it carries no CommitteeList (its
// `ltedWeight` is a Decimal, which cannot cross the boundary); the group has it.
export type MembershipRequestWithDetails = {
  id: string;
  committeeListId: number;
  voterRecord: RequestVoterFields;
  submissionMetadata: unknown;
  seatNumber: number | null;
  submittedAt: Date;
};

const getCommitteeName = (committeeList: CommitteeList) => {
  if (committeeList.cityTown === "ROCHESTER") {
    return `${committeeList.cityTown}, ${committeeList.legDistrict}, ${committeeList.electionDistrict}`;
  }

  return `${committeeList.cityTown}, ${committeeList.electionDistrict}`;
};

type CommitteeGroup = {
  committeeList: CommitteeList;
  submissions: MembershipRequestWithDetails[];
  exitReports: PendingExitReport[];
};

const countLabel = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

/** A full-page message in place of the list (no access, no active term). */
function PageNotice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-md border bg-white p-6 text-center">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="mt-1 text-sm text-muted-foreground">{children}</div>
        </div>
      </div>
    </PageContainer>
  );
}

const CommitteeRequests: React.FC = async () => {
  const permissions = await auth();

  if (
    !permissions?.user?.privilegeLevel ||
    !hasPermissionFor(permissions?.user?.privilegeLevel, PrivilegeLevel.Admin)
  ) {
    return (
      <PageNotice title="You do not have permission to view this page">
        Pending committee requests are reviewed by Admins.{" "}
        <Link href="/committees" className="underline">
          Back to committees
        </Link>
      </PageNotice>
    );
  }

  let activeTermId: string;
  try {
    activeTermId = await getActiveTermId();
  } catch {
    return (
      <PageNotice title="No active term found">
        Please set an active term in admin settings.
      </PageNotice>
    );
  }

  // SRS 1.2 — Query SUBMITTED CommitteeMemberships instead of CommitteeRequests.
  // Pending Exit Reports live on the outgoing member's ACTIVE row.
  const [pendingMemberships, exitReportedMemberships] = await Promise.all([
    prisma.committeeMembership.findMany({
      where: { status: MembershipStatus.SUBMITTED, termId: activeTermId },
      include: {
        committeeList: true,
        voterRecord: { select: REQUEST_VOTER_SELECT },
      },
    }),
    prisma.committeeMembership.findMany({
      where: pendingExitReportWhere(activeTermId),
      orderBy: { exitReportedAt: "asc" },
      include: { ...PENDING_EXIT_REPORT_INCLUDE, committeeList: true },
    }),
  ]);

  const groups = new Map<string, CommitteeGroup>();
  const groupFor = (committeeList: CommitteeList) => {
    const key = String(committeeList.id);
    let group = groups.get(key);
    if (!group) {
      group = { committeeList, submissions: [], exitReports: [] };
      groups.set(key, group);
    }
    return group;
  };

  for (const m of pendingMemberships) {
    groupFor(m.committeeList).submissions.push({
      id: m.id,
      committeeListId: m.committeeListId,
      voterRecord: m.voterRecord,
      submissionMetadata: m.submissionMetadata,
      seatNumber: m.seatNumber,
      submittedAt: m.submittedAt,
    });
  }

  // No id means no report is "own"; Admin context is shown either way.
  const viewer = { userId: permissions.user.id ?? "", isAdmin: true };
  for (const m of exitReportedMemberships) {
    const report = toPendingExitReport(m, viewer);
    if (report) groupFor(m.committeeList).exitReports.push(report);
  }

  // By committee id; the queries return committees in no set order.
  const committeeListIds = [...groups.keys()].sort(
    (a, b) => Number(a) - Number(b),
  );
  const submissionCount = pendingMemberships.length;
  const exitCount = [...groups.values()].reduce(
    (n, g) => n + g.exitReports.length,
    0,
  );

  // The heading stays at the same spot in both branches so React keeps the
  // element across router.refresh(): Exit Report decisions focus it.
  const heading = (
    <h1 id={REQUESTS_HEADING_ID} tabIndex={-1} className="text-lg font-semibold outline-none">
      Pending requests
    </h1>
  );

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {heading}
            {committeeListIds.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {[
                  countLabel(committeeListIds.length, "committee", "committees"),
                  countLabel(submissionCount, "submission", "submissions"),
                  countLabel(exitCount, "reported exit", "reported exits"),
                ].join(" · ")}
              </p>
            )}
          </div>
          {committeeListIds.length > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/meetings">Process in bulk via Meetings</Link>
            </Button>
          )}
        </div>
        {committeeListIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending committee requests found
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Review and reject individually below. Confirmations are processed
              via a meeting record.
            </p>
            {committeeListIds.map((committeeListId) => {
              const group = groups.get(committeeListId);
              if (!group) return null;
              const { committeeList, submissions, exitReports } = group;
              const headingId = `committee-${committeeListId}-heading`;
              return (
                <section key={committeeListId} aria-labelledby={headingId}>
                  <h2
                    id={headingId}
                    className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 px-1 text-sm font-medium"
                  >
                    <span>{getCommitteeName(committeeList)}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {countLabel(
                        submissions.length + exitReports.length,
                        "pending",
                        "pending",
                      )}
                    </span>
                  </h2>
                  <div className="divide-y rounded-md border bg-white text-sm">
                    {submissions.length > 0 && (
                      <ul className="divide-y" aria-label="Submissions">
                        {submissions.map((request) => (
                          <RequestRow request={request} key={request.id} />
                        ))}
                      </ul>
                    )}
                    {exitReports.length > 0 && (
                      <ExitReportList reports={exitReports} />
                    )}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default CommitteeRequests;
