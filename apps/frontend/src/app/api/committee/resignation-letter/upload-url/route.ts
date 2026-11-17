/**
 * POST /api/committee/resignation-letter/upload-url — a presigned PUT for one
 * Resignation Letter (ticket 08 decisions 9–10). RequestAccess and above.
 *
 * The URL signs the declared Content-Type and Content-Length and expires in 5
 * minutes; it writes under `resignation-letters/staging/<membershipId>/`. The
 * submit that uses the letter checks the key's prefix and the real bytes, so
 * nothing here is trusted beyond getting a URL.
 *
 * The member is a current (ACTIVE) one, for a Leader's resignation Exit
 * Report or an Admin's Record resignation. A Leader must have jurisdiction,
 * and the member must not already have a pending report (no editing a filed
 * report).
 */
import { type NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { PrivilegeLevel } from "@prisma/client";
import { toDbSentinelValue } from "@voter-file-tool/shared-validators";
import prisma from "~/lib/prisma";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import {
  ACTIVE_MEMBERSHIP_STATUS,
  getActiveTermId,
} from "~/app/api/lib/committeeValidation";
import { leaderMayActOnCommittee } from "~/app/api/lib/exitReportAccess";
import { isActualAdmin } from "~/app/api/lib/resignationLetterAccess";
import { issueLetterUpload } from "~/app/api/lib/resignationLetterStorage";
import { letterUploadSchema } from "~/lib/validations/committee";

function error(status: number, message: string) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function uploadUrlHandler(req: NextRequest, session: SessionWithUser) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error(400, "Invalid JSON format");
  }

  const validation = validateRequest(body, letterUploadSchema);
  if (!validation.success) return validation.response;
  const { cityTown, legDistrict, electionDistrict, memberId, contentType, size } =
    validation.data;
  const privilegeLevel = session.user.privilegeLevel;

  try {
    const activeTermId = await getActiveTermId();
    const committee = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict_termId: {
          cityTown,
          legDistrict: toDbSentinelValue(legDistrict),
          electionDistrict,
          termId: activeTermId,
        },
      },
    });
    if (!committee) return error(404, "Committee not found in the active term");

    const allowed = await leaderMayActOnCommittee({
      userId: session.user.id,
      privilegeLevel,
      termId: activeTermId,
      committee,
    });
    if (!allowed) {
      return error(403, "You do not have jurisdiction access for this committee");
    }

    const membership = await prisma.committeeMembership.findUnique({
      where: {
        voterRecordId_committeeListId_termId: {
          voterRecordId: memberId,
          committeeListId: committee.id,
          termId: activeTermId,
        },
      },
      select: { id: true, status: true, exitReportedAt: true },
    });
    if (!membership) return error(404, "Member not found in this committee");
    if (membership.status !== ACTIVE_MEMBERSHIP_STATUS) {
      return error(400, "Member does not have an active membership in this committee");
    }
    // A Leader attaches a letter only while filing; a filed report isn't edited.
    if (!isActualAdmin(privilegeLevel) && membership.exitReportedAt !== null) {
      return error(409, "An exit has already been reported for this member");
    }

    const grant = await issueLetterUpload({
      membershipId: membership.id,
      contentType,
      size,
    });
    return NextResponse.json(grant, { status: 200 });
  } catch (err) {
    Sentry.captureException(err, { tags: { operation: "resignationLetterUploadUrl" } });
    console.error(err);
    return error(500, "Internal server error");
  }
}

export const POST = withPrivilege(PrivilegeLevel.RequestAccess, uploadUrlHandler);
