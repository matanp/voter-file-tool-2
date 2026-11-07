/**
 * POST /api/committee/resignation-letter/upload-url — a presigned PUT for one
 * Resignation Letter (ticket 08 decisions 9–10). RequestAccess and above.
 *
 * The URL signs the declared Content-Type and Content-Length and expires in 5
 * minutes; it writes to `resignation-letters/staging/<random>`. The response
 * also carries a token bound to the staging key, the caller, the membership,
 * and the declared type and size. The submit that uses the letter checks the
 * token and the real bytes, so nothing here is trusted beyond getting a URL.
 *
 * Which membership:
 *
 * - `{ cityTown, legDistrict?, electionDistrict, memberId }`: a current
 *   (ACTIVE) member, for a Leader's resignation Exit Report or an Admin's
 *   Record resignation. A Leader must have jurisdiction, and the member must
 *   not already have a pending report (no editing a filed report).
 * - `{ membershipId }`: Admin only, a RESIGNED membership's late attach.
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
import {
  letterUploadByIdSchema,
  letterUploadByMemberSchema,
} from "~/lib/validations/committee";

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

  const userId = session.user.id;
  const privilegeLevel = session.user.privilegeLevel;
  const byId =
    typeof body === "object" && body !== null && "membershipId" in body;

  try {
    let membershipId: string;
    let file: { contentType: Parameters<typeof issueLetterUpload>[0]["contentType"]; size: number };

    if (byId) {
      const validation = validateRequest(body, letterUploadByIdSchema);
      if (!validation.success) return validation.response;
      if (!isActualAdmin(privilegeLevel)) {
        return error(403, "Only an Admin can attach a letter to a recorded resignation");
      }
      const membership = await prisma.committeeMembership.findUnique({
        where: { id: validation.data.membershipId },
        select: { id: true, status: true },
      });
      if (!membership) return error(404, "Membership not found");
      if (membership.status !== "RESIGNED") {
        return error(400, "Letters can be attached only to a recorded resignation");
      }
      membershipId = membership.id;
      file = validation.data;
    } else {
      const validation = validateRequest(body, letterUploadByMemberSchema);
      if (!validation.success) return validation.response;
      const { cityTown, legDistrict, electionDistrict, memberId } =
        validation.data;
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
        userId,
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
      membershipId = membership.id;
      file = validation.data;
    }

    const grant = await issueLetterUpload({
      userId,
      membershipId,
      contentType: file.contentType,
      size: file.size,
    });
    return NextResponse.json(grant, { status: 200 });
  } catch (err) {
    Sentry.captureException(err, { tags: { operation: "resignationLetterUploadUrl" } });
    console.error(err);
    return error(500, "Internal server error");
  }
}

export const POST = withPrivilege(PrivilegeLevel.RequestAccess, uploadUrlHandler);
