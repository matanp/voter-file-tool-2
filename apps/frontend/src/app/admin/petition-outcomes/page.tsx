import React from "react";
import prisma from "~/lib/prisma";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import { PetitionOutcomesClient } from "./PetitionOutcomesClient";

interface PetitionOutcomesPageProps {
  searchParams?:
    | {
        committeeListId?: string;
      }
    | Promise<{
        committeeListId?: string;
      }>;
}

export default async function PetitionOutcomesPage({
  searchParams,
}: PetitionOutcomesPageProps) {
  const activeTermId = await getActiveTermId();
  if (activeTermId == null) {
    return (
      <div className="w-full p-6">
        <h1 className="text-2xl font-semibold mb-6">Petition & Primary Outcomes</h1>
        <p className="text-muted-foreground">No active committee term is set. Configure an active term to manage petition outcomes.</p>
      </div>
    );
  }
  const term = await prisma.committeeTerm.findUnique({
    where: { id: activeTermId },
    select: { id: true, label: true },
  });
  const committeeLists = await prisma.committeeList.findMany({
    where: { termId: activeTermId },
    select: {
      id: true,
      cityTown: true,
      legDistrict: true,
      electionDistrict: true,
      termId: true,
      seats: { orderBy: { seatNumber: "asc" }, select: { id: true, seatNumber: true, isPetitioned: true } },
    },
  });
  const params = (await Promise.resolve(searchParams)) ?? {};
  const parsedCommitteeListId = Number(params.committeeListId);
  const initialCommitteeListId = Number.isInteger(parsedCommitteeListId)
    ? parsedCommitteeListId
    : null;

  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-semibold mb-6">Petition & Primary Outcomes</h1>
      <PetitionOutcomesClient
        activeTermId={activeTermId}
        termLabel={term?.label ?? ""}
        committeeLists={committeeLists}
        initialCommitteeListId={initialCommitteeListId}
      />
    </div>
  );
}
