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
import { validateRequest } from "~/app/api/lib/validateRequest";
import { letterOnRow } from "~/lib/resignationLetter";
import { letterViewQuerySchema } from "~/lib/validations/committee";
import { letterViewAccess } from "~/app/api/lib/resignationLetterAccess";
import { letterReadUrl } from "~/app/api/lib/resignationLetterStorage";

async function getLetterHandler(req: NextRequest, session: SessionWithUser) {
  const { searchParams } = req.nextUrl;
  const validation = validateRequest(
    {
      membershipId: searchParams.get("membershipId") ?? undefined,
      redirect: searchParams.get("redirect") ?? undefined,
    },
    letterViewQuerySchema,
  );
  if (!validation.success) return validation.response;
  const { membershipId, redirect } = validation.data;

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
    if (!membership) {
      return NextResponse.json(
        { success: false, error: "Membership not found" },
        { status: 404 },
      );
    }
    // Access first, so a reader without it can't tell whether a letter exists.
    const access = await letterViewAccess({
      viewer: {
        userId: session.user.id,
        privilegeLevel: session.user.privilegeLevel,
      },
      membership,
    });
    if (access !== "allowed") {
      return NextResponse.json(
        { success: false, error: "You do not have access to this letter" },
        { status: 403 },
      );
    }
    const letter = letterOnRow(membership);
    if (!letter) {
      return NextResponse.json(
        { success: false, error: "No letter is attached" },
        { status: 404 },
      );
    }
    const url = await letterReadUrl(letter);
    if (redirect === "1") {
      return NextResponse.redirect(url, { status: 302 });
    }
    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: "resignationLetterView" },
      extra: { membershipId },
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Leader, getLetterHandler);
