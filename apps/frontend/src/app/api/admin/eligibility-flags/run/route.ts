import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { runEligibilityFlaggingSchema } from "~/lib/validations/eligibilityFlags";
import prisma from "~/lib/prisma";
import { runBoeEligibilityFlagging } from "@voter-file-tool/shared-validators";

async function runEligibilityFlagsHandler(
  req: NextRequest,
  _session: Session,
) {
  let body: unknown = {};
  try {
    body = (await req.json()) as unknown;
  } catch {
    // Empty body is allowed (defaults to active term).
  }

  const validation = validateRequest(body, runEligibilityFlaggingSchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const summary = await runBoeEligibilityFlagging(prisma, {
      termId: validation.data.termId,
    });
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    console.error("Eligibility flag run failed:", error);
    return NextResponse.json(
      { error: "Failed to run eligibility flagging" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(
  PrivilegeLevel.Admin,
  runEligibilityFlagsHandler,
);
