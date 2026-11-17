/**
 * GET /api/committee/resignation-letter?membershipId=…[&redirect=1] — a
 * 5-minute presigned GET for a membership's Resignation Letter (ticket 08
 * decisions 4, 13, 17). Leader and above, the same readers as the committee
 * detail; access is checked with the actual privilege
 * (`letterViewAccess`): Admins always, others only while the letter belongs
 * to a pending resignation report in their jurisdiction.
 *
 * Returns `{ url }`, or with `redirect=1` a redirect to it, so a plain link
 * can open the letter in a new tab. The URL serves the type sniffed at upload
 * and `inline` (PDF / JPEG / PNG) or `attachment` (HEIC). Views aren't logged.
 */
import { type NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { PrivilegeLevel } from "@prisma/client";
import prisma from "~/lib/prisma";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import { letterOnRow } from "~/lib/resignationLetter";
import { letterViewAccess } from "~/app/api/lib/resignationLetterAccess";
import { letterReadUrl } from "~/app/api/lib/resignationLetterStorage";

async function getLetterHandler(req: NextRequest, session: SessionWithUser) {
  const membershipId = req.nextUrl.searchParams.get("membershipId")?.trim();
  if (!membershipId) {
    return NextResponse.json({ error: "membershipId is required" }, { status: 400 });
  }
  try {
    const membership = await prisma.committeeMembership.findUnique({
      where: { id: membershipId },
      select: {
        status: true,
        exitReportedKind: true,
        termId: true,
        resignationLetterKey: true,
        resignationLetterContentType: true,
        resignationLetterFileName: true,
        committeeList: { select: { cityTown: true, legDistrict: true } },
      },
    });
    const letter = membership ? letterOnRow(membership) : null;
    if (!membership || !letter) {
      return NextResponse.json({ error: "No letter is attached" }, { status: 404 });
    }
    const access = await letterViewAccess({
      viewer: {
        userId: session.user.id,
        privilegeLevel: session.user.privilegeLevel,
      },
      membership,
    });
    if (access !== "allowed") {
      return NextResponse.json(
        { error: "You do not have access to this letter" },
        { status: 403 },
      );
    }
    const url = await letterReadUrl(letter);
    if (req.nextUrl.searchParams.get("redirect") === "1") {
      return NextResponse.redirect(url, { status: 302 });
    }
    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: "resignationLetterView" },
      extra: { membershipId },
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const GET = withPrivilege(PrivilegeLevel.Leader, getLetterHandler);
