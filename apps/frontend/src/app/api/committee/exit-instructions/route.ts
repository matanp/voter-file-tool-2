/**
 * GET /api/committee/exit-instructions — the Admin-set text a Leader sees
 * before filing an Exit Report (e.g. where to send the resignation letter).
 *
 * RequestAccess and above, because `/api/admin/governance-config` is
 * Admin-only. Returns only `{ text }`: nothing else from the governance
 * config. The dialog fetches it each time it opens, so an Admin's edit is
 * never stale.
 */

import { NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { blankToNull } from "~/lib/blankToNull";
import prisma from "~/lib/prisma";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import type { ExitInstructionsResponse } from "~/lib/validations/committee";

async function getExitInstructions() {
  const config = await prisma.committeeGovernanceConfig.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { exitReportInstructions: true },
  });
  const text = blankToNull(config?.exitReportInstructions);
  const body: ExitInstructionsResponse = { text };
  return NextResponse.json(body, { status: 200 });
}

export const GET = withPrivilege(
  PrivilegeLevel.RequestAccess,
  getExitInstructions,
);
