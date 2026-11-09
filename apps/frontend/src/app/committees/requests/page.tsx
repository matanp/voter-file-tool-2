import React from "react";

import prisma from "~/lib/prisma";
import { hasPermissionFor } from "~/lib/utils";
import {
  type CommitteeList,
  MembershipStatus,
  PrivilegeLevel,
  type VoterRecord,
} from "@prisma/client";
import { auth } from "~/auth";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { RequestCard } from "./RequestCard";
import { ExitReportList } from "./ExitReportList";
import { REQUESTS_HEADING_ID } from "./requestsHeading";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import {
  PENDING_EXIT_REPORT_INCLUDE,
  pendingExitReportWhere,
  toPendingExitReport,
} from "~/app/api/lib/pendingExitReports";
import type { PendingExitReport } from "~/lib/validations/committee";
import { personName, VOTER_NAME_SELECT } from "~/lib/personName";

export const dynamic = "force-dynamic";

export type MembershipRequestWithDetails = {
  id: string;
  committeeListId: number;
  committeeList: CommitteeList;
  voterRecord: VoterRecord;
  submissionMetadata: unknown;
  /**
   * A replacement's outgoing member: the ACTIVE row whose Exit Report is
   * paired with this Submission (ticket 09). Null for a plain add.
   */
  replaces: { voterRecordId: string; name: string } | null;
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

const CommitteeRequests: React.FC = async () => {
  const permissions = await auth();

  if (
    !permissions?.user?.privilegeLevel ||
    !hasPermissionFor(permissions?.user?.privilegeLevel, PrivilegeLevel.Admin)
  ) {
    return <div>You do not have permission to view this page</div>;
  }

  let activeTermId: string;
  try {
    activeTermId = await getActiveTermId();
  } catch {
    return <div>No active term found. Please set an active term in admin settings.</div>;
  }

  // SRS 1.2 — Query SUBMITTED CommitteeMemberships instead of CommitteeRequests.
  // Pending Exit Reports live on the outgoing member's ACTIVE row.
  const [pendingMemberships, exitReportedMemberships] = await Promise.all([
    prisma.committeeMembership.findMany({
      where: { status: MembershipStatus.SUBMITTED, termId: activeTermId },
      include: {
        committeeList: true,
        voterRecord: true,
        replacing: {
          select: {
            voterRecord: { select: VOTER_NAME_SELECT },
          },
        },
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
      committeeList: m.committeeList,
      voterRecord: m.voterRecord,
      submissionMetadata: m.submissionMetadata,
      replaces: m.replacing
        ? {
            voterRecordId: m.replacing.voterRecord.VRCNUM,
            name: personName(m.replacing.voterRecord, m.replacing.voterRecord.VRCNUM),
          }
        : null,
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
  const firstCommitteeListId = committeeListIds[0];
  const defaultOpenItems =
    firstCommitteeListId && committeeListIds.length === 1
      ? [firstCommitteeListId]
      : [];

  // The heading stays at the same spot in both branches so React keeps the
  // element across router.refresh(): Exit Report decisions focus it.
  const heading = (
    <h1 id={REQUESTS_HEADING_ID} tabIndex={-1} className="text-lg font-semibold outline-none">
      Pending requests
    </h1>
  );

  if (committeeListIds.length === 0) {
    return (
      <div className="w-96 m-4 space-y-4">
        {heading}
        <p>No pending committee requests found</p>
      </div>
    );
  }

  return (
    <div className="w-96 m-4 space-y-4">
      {heading}
      <p className="text-sm text-muted-foreground">
        Review and reject individually below. Confirmations are processed via a
        meeting record.
      </p>
      <Button variant="outline" asChild>
        <Link href="/admin/meetings">Process in bulk via Meetings</Link>
      </Button>
      <Accordion type="multiple" defaultValue={defaultOpenItems}>
        {committeeListIds.map((committeeListId) => {
          const group = groups.get(committeeListId);
          if (!group) return null;
          const { committeeList, submissions, exitReports } = group;
          const counts = [
            submissions.length > 0 &&
              countLabel(submissions.length, "submission", "submissions"),
            exitReports.length > 0 &&
              countLabel(exitReports.length, "reported exit", "reported exits"),
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <AccordionItem key={committeeListId} value={committeeListId}>
              <AccordionTrigger>
                <span className="flex flex-wrap items-baseline gap-x-2 text-left">
                  <span>{getCommitteeName(committeeList)}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {counts}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {submissions.map((request) => (
                  <RequestCard request={request} key={request.id} />
                ))}
                {exitReports.length > 0 && (
                  <section className="my-2 space-y-2">
                    <h3 className="font-semibold">Reported exits</h3>
                    <ExitReportList reports={exitReports} />
                  </section>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default CommitteeRequests;
