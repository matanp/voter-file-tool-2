import { NextResponse, type NextRequest } from "next/server";
import prisma from "~/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";
import { logAuditEvent } from "~/lib/auditLog";
import {
  INVALID_DATE_MESSAGE,
  parseCalendarDate,
  utcDayRange,
} from "~/lib/electionConfigParsing";

/** Fetch and return all electionDate records ordered by date for the admin API. */
async function getElectionDatesHandler(_req: NextRequest, _session: Session) {
  try {
    const dates = await prisma.electionDate.findMany({
      orderBy: { date: "asc" },
    });
    return NextResponse.json(dates);
  } catch (error) {
    console.error("Error fetching election dates:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * Strict calendar-date input: `YYYY-MM-DD` or `M/D/YYYY` only.
 *
 * This deliberately narrows what the route used to accept (anything `Date.parse`
 * swallowed, including full ISO instants). Two definitions of "a valid election date" in
 * one tree is exactly the duplication the shared parser exists to stop.
 */
const createDateSchema = z.object({
  date: z.string().refine((val) => parseCalendarDate(val) !== null, {
    message: INVALID_DATE_MESSAGE,
  }),
});

async function postElectionDateHandler(
  req: NextRequest,
  session: SessionWithUser,
) {
  try {
    const body = (await req.json()) as unknown;
    const parsed = createDateSchema.parse(body);

    // The schema already rejected anything the strict parser cannot read; it returns a
    // UTC-midnight Date, so no further normalization is needed.
    const electionDate = parseCalendarDate(parsed.date);
    if (electionDate === null) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Match by UTC day, never by exact instant: a stray non-midnight row would be missed
    // by an equality check, pass the `@unique` index (it is a different instant), and
    // land as a silent duplicate — two Nov 3 entries in the dropdown.
    const existingDate = await prisma.electionDate.findFirst({
      where: { date: utcDayRange(electionDate) },
    });

    if (existingDate) {
      return NextResponse.json(
        { error: "Election date already exists" },
        { status: 409 },
      );
    }

    const newDate = await prisma.electionDate.create({
      data: { date: electionDate },
    });

    // Fail-open, matching the bulk route: election-config edits are reference/config
    // telemetry, not membership state, so a failed audit write must not fail the add.
    await logAuditEvent(
      session.user.id,
      session.user.privilegeLevel ?? PrivilegeLevel.Admin,
      "ELECTION_DATE_CREATED",
      "ElectionDate",
      String(newDate.id),
      null,
      { id: newDate.id, date: newDate.date },
    );

    revalidatePath("/petitions");

    return NextResponse.json(newDate, { status: 201 });
  } catch (error) {
    console.error("Error creating election date:", error);

    // Handle Prisma unique constraint violation
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Election date already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}

export const GET = withPrivilege(PrivilegeLevel.Admin, getElectionDatesHandler);
export const POST = withPrivilege(
  PrivilegeLevel.Admin,
  postElectionDateHandler,
);
