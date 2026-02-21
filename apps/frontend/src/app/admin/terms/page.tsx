import React from "react";
import prisma from "~/lib/prisma";
import type { CommitteeTerm } from "@prisma/client";
import { TermsManagement } from "./TermsManagement";

export default async function TermsPage() {
  // Prisma client is typed in ~/lib/prisma; ESLint sometimes misresolves in RSC context
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const terms: CommitteeTerm[] = await prisma.committeeTerm.findMany({
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-semibold mb-6">Committee Terms</h1>
      <TermsManagement initialTerms={terms} />
    </div>
  );
}
