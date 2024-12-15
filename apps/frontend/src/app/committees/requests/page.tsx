import React from "react";

import prisma from "~/lib/prisma";
import { hasPermissionFor } from "~/lib/utils";
import {
  CommitteeList,
  CommitteeRequest,
  PrivilegeLevel,
  VoterRecord,
} from "@prisma/client";
import { auth } from "~/auth";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { RequestCard } from "./RequestCard";

export type CommitteeRequestWithDetails = CommitteeRequest & {
  committeList: CommitteeList;
  addVoterRecord: VoterRecord | null;
  removeVoterRecord: VoterRecord | null;
};

const getCommitteeName = (committeeList: CommitteeList) => {
  if (committeeList.cityTown === "ROCHESTER") {
    return `${committeeList.cityTown}, ${committeeList.legDistrict}, ${committeeList.electionDistrict}`;
  }

  return `${committeeList.cityTown}, ${committeeList.electionDistrict}`;
};

const groupByCommitteeId = (
  requests: CommitteeRequestWithDetails[],
): Record<string, CommitteeRequestWithDetails[]> => {
  return requests.reduce(
    (acc, request) => {
      const { committeeListId } = request;
      if (!acc[committeeListId]) {
        acc[committeeListId] = [];
      }

      const groupedCommitteeList = acc[committeeListId];

      if (groupedCommitteeList) {
        groupedCommitteeList.push(request);
      }
      return acc;
    },
    {} as Record<string, CommitteeRequestWithDetails[]>,
  );
};

const CommitteeLists: React.FC = async () => {
  const permissions = await auth();

  if (
    !permissions?.user?.privilegeLevel ||
    !hasPermissionFor(permissions?.user?.privilegeLevel, PrivilegeLevel.Admin)
  ) {
    return <div>You do not have permission to view this page</div>;
  }

  const committeeRequests: CommitteeRequestWithDetails[] =
    await prisma.committeeRequest.findMany({
      include: {
        committeList: true,
        addVoterRecord: true,
        removeVoterRecord: true,
      },
    });

  const groupedRequests = groupByCommitteeId(committeeRequests);
  const committeListIds = Object.keys(groupedRequests);
  const firstCommitteeListId = committeListIds[0];
  const defaultOpenItems =
    firstCommitteeListId && committeListIds.length === 1
      ? [firstCommitteeListId]
      : [];

  if (committeListIds.length === 0) {
    return <div>No requests found</div>;
  }

  return (
    <div className="w-96 m-4">
      <Accordion type="multiple" defaultValue={defaultOpenItems}>
        {Object.keys(groupedRequests).map((committeeListId) => {
          const requests = groupedRequests[committeeListId];

          if (!requests || requests.length === 0) return null;
          const firstRequest = requests[0];
          if (!firstRequest) return null;

          return (
            <AccordionItem key={committeeListId} value={`${committeeListId}`}>
              <AccordionTrigger>
                {getCommitteeName(firstRequest.committeList)}
              </AccordionTrigger>
              <AccordionContent>
                {requests.map((request) => (
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

export default CommitteeLists;
