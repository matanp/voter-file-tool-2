/**
 * /api/admin/committees/missing
 *
 * GET  — preview voter-file EDs that have no committee in the active term.
 * POST — create those committees (with empty seats) so every ED can be picked
 *        in the committee menus and filled.
 */

import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import prisma from "~/lib/prisma";
import { z } from "zod";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import type { SessionWithUser } from "~/app/api/lib/withPrivilege";
import {
  getActiveTerm,
  findActiveTerm,
  getGovernanceConfig,
} from "~/app/api/lib/committeeValidation";
import { logAuditEventOrThrow } from "~/lib/auditLog";
import {
  createCommittees,
  findMissingCommittees,
} from "~/lib/committees/missingCommittees";

export const maxDuration = 60;

// Each committee needs a row plus its seats; a full county is a few hundred rows.
const CREATE_TRANSACTION_TIMEOUT_MS = 30_000;

async function getHandler() {
  try {
    const term = await getActiveTerm();
    const { missing, unknownTownCodes } = await findMissingCommittees(term.id);
    return NextResponse.json({
      termId: term.id,
      termLabel: term.label,
      missing,
      unknownTownCodes,
    });
  } catch (error) {
    console.error("Missing committees preview error:", error);
    return NextResponse.json(
      { error: "Failed to load missing committees" },
      { status: 500 },
    );
  }
}

const createMissingSchema = z.object({ termId: z.string().min(1) });

async function postHandler(req: NextRequest, session: SessionWithUser) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const validation = validateRequest(body, createMissingSchema);
  if (!validation.success) return validation.response;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const term = await findActiveTerm(tx);
        if (!term || term.id !== validation.data.termId) return null;

        const { maxSeatsPerLted } = await getGovernanceConfig();
        const { missing } = await findMissingCommittees(term.id, tx);
        const committees = missing.map(
          ({ cityTown, legDistrict, electionDistrict }) => ({
            cityTown,
            legDistrict,
            electionDistrict,
          }),
        );
        const counts = await createCommittees(
          tx,
          term.id,
          committees,
          maxSeatsPerLted,
        );

        if (counts.committeesCreated > 0) {
          await logAuditEventOrThrow(
            session.user.id,
            session.user.privilegeLevel ?? PrivilegeLevel.Admin,
            "MISSING_COMMITTEES_CREATED",
            "CommitteeList",
            `missing-${term.id}-${Date.now()}`,
            null,
            { ...counts, committees },
            { termId: term.id, source: "voterFile" },
            tx,
          );
        }

        return { termId: term.id, ...counts };
      },
      { timeout: CREATE_TRANSACTION_TIMEOUT_MS },
    );

    if (!result) {
      return NextResponse.json(
        {
          error: "The active term changed. Refresh the preview and try again.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Create missing committees error:", error);
    return NextResponse.json(
      { error: "Failed to create missing committees" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Admin, getHandler);
export const POST = withPrivilege(PrivilegeLevel.Admin, postHandler);
