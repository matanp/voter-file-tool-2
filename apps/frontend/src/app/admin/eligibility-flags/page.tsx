import prisma from "~/lib/prisma";
import { EligibilityFlagsTable } from "./EligibilityFlagsTable";

export default async function EligibilityFlagsPage() {
  const activeTerm = await prisma.committeeTerm.findFirst({
    where: { isActive: true },
    select: { id: true, label: true },
  });

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Eligibility Flags</h1>
        <p className="text-muted-foreground">
          Review BOE-driven eligibility discrepancies and confirm or dismiss each
          flag.
        </p>
      </div>
      <EligibilityFlagsTable
        activeTermId={activeTerm?.id}
        activeTermLabel={activeTerm?.label}
      />
    </div>
  );
}
