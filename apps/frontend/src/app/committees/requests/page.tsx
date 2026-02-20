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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { RequestCard } from "./RequestCard";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";

export type MembershipRequestWithDetails = {
  id: string;
  committeeListId: number;
  committeeList: CommitteeList;
  voterRecord: VoterRecord;
  submissionMetadata: unknown;
};

const getCommitteeName = (committeeList: CommitteeList) => {
  if (committeeList.cityTown === "ROCHESTER") {
    return `${committeeList.cityTown}, ${committeeList.legDistrict}, ${committeeList.electionDistrict}`;
  }

  return `${committeeList.cityTown}, ${committeeList.electionDistrict}`;
};

const groupByCommitteeId = (
  requests: MembershipRequestWithDetails[],
): Record<string, MembershipRequestWithDetails[]> => {
  return requests.reduce(
    (acc, request) => {
      const key = String(request.committeeListId);
      (acc[key] ??= []).push(request);
      return acc;
    },
    {} as Record<string, MembershipRequestWithDetails[]>,
  );
};

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

  // SRS 1.2 — Query SUBMITTED CommitteeMemberships instead of CommitteeRequests
  const pendingMemberships = await prisma.committeeMembership.findMany({
    where: { status: MembershipStatus.SUBMITTED, termId: activeTermId },
    include: {
      committeeList: true,
      voterRecord: true,
    },
  });

  const requests: MembershipRequestWithDetails[] = pendingMemberships.map(
    (m) => ({
      id: m.id,
      committeeListId: m.committeeListId,
      committeeList: m.committeeList,
      voterRecord: m.voterRecord,
      submissionMetadata: m.submissionMetadata,
    }),
  );

  const groupedRequests = groupByCommitteeId(requests);
  const committeeListIds = Object.keys(groupedRequests);
  const firstCommitteeListId = committeeListIds[0];
  const defaultOpenItems =
    firstCommitteeListId && committeeListIds.length === 1
      ? [firstCommitteeListId]
      : [];

  if (committeeListIds.length === 0) {
    return <div>No pending committee requests found</div>;
  }

  return (
    <div className="w-96 m-4">
      <Accordion type="multiple" defaultValue={defaultOpenItems}>
        {committeeListIds.map((committeeListId) => {
          const reqs = groupedRequests[committeeListId];

          if (!reqs || reqs.length === 0) return null;
          const firstReq = reqs[0];
          if (!firstReq) return null;

          return (
            <AccordionItem key={committeeListId} value={committeeListId}>
              <AccordionTrigger>
                {getCommitteeName(firstReq.committeeList)}
              </AccordionTrigger>
              <AccordionContent>
                {reqs.map((request) => (
                  <RequestCard request={request} key={request.id} />
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default CommitteeRequests;
