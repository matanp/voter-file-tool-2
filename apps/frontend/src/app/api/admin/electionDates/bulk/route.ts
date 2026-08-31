import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { PrivilegeLevel, type ElectionDate } from "@prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "~/lib/prisma";
import { logAuditEvent } from "~/lib/auditLog";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import {
  INVALID_DATE_MESSAGE,
  MAX_BULK_ROWS,
  parseCalendarDate,
  utcDayRange,
} from "~/lib/electionConfigParsing";

const bulkElectionDatesSchema = z.object({
  dates: z
    .array(
      z.string().refine((value) => parseCalendarDate(value) !== null, {
        message: INVALID_DATE_MESSAGE,
      }),
    )
    .min(1, "At least one date is required")
    .max(MAX_BULK_ROWS, `At most ${MAX_BULK_ROWS} dates per request`),
});

/** UTC-day key used to compare dates within the batch and against existing rows. */
function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Creates many election dates in one request.
 *
 * Everything the client's preview computed is recomputed here: the cap, the strict
 * calendar-date parse, the in-batch dedupe and the existing-record precheck. The response
 * is `{ created, skipped }` — there is deliberately no `failed` array, because no
 * execution path can populate one: a row that loses to the precheck is a skip, and a row
 * that collides at the DB is dropped by `skipDuplicates` rather than failing the batch.
 */
async function bulkCreateElectionDatesHandler(
  request: NextRequest,
  session: SessionWithUser,
) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = bulkElectionDatesSchema.parse(body);

    // In-batch dedupe by UTC day, first wins.
    const candidates: { input: string; date: Date }[] = [];
    const seen = new Set<string>();
    const skipped: string[] = [];
    for (const input of parsed.dates) {
      // The schema already rejected anything the strict parser cannot read.
      const date = parseCalendarDate(input);
      if (date === null) continue;
      const key = utcDayKey(date);
      if (seen.has(key)) {
        skipped.push(input);
        continue;
      }
      seen.add(key);
      candidates.push({ input, date });
    }

    const { created } = await prisma.$transaction(async (tx) => {
      // Match by UTC day, never by exact instant: a stray non-midnight row would be
      // missed by an equality precheck, pass the `@unique` index (it is a different
      // instant), and land as a silent duplicate — two Nov 3 entries in the dropdown.
      const existing = await tx.electionDate.findMany({
        where: {
          OR: candidates.map(({ date }) => ({ date: utcDayRange(date) })),
        },
      });
      const existingKeys = new Set(
        existing.map((record) => utcDayKey(record.date)),
      );

      const toCreate = candidates.filter(
        ({ date }) => !existingKeys.has(utcDayKey(date)),
      );

      // `skipDuplicates` keys off the DB unique index, so it is a backstop for the race
      // between the precheck and the insert, not a replacement for the day-range
      // precheck above.
      const createdRecords: ElectionDate[] =
        toCreate.length > 0
          ? await tx.electionDate.createManyAndReturn({
              data: toCreate.map(({ date }) => ({ date })),
              skipDuplicates: true,
            })
          : [];

      return { created: createdRecords };
    });

    // Anything not in `created` is a skip: either it matched an existing row in the
    // precheck, or it passed the precheck and lost the race to a concurrent insert
    // (Postgres skipped it). Neither is a failure.
    const createdKeys = new Set(
      created.map((record) => utcDayKey(record.date)),
    );
    for (const { input, date } of candidates) {
      if (!createdKeys.has(utcDayKey(date))) {
        skipped.push(input);
      }
    }

    if (created.length > 0) {
      // Fail-open: election-config bulk adds are reference/config telemetry, not
      // membership state. A failed audit write must not stop an admin loading their
      // election dates.
      await logAuditEvent(
        session.user.id,
        session.user.privilegeLevel ?? PrivilegeLevel.Admin,
        "ELECTION_DATES_BULK_CREATED",
        "ElectionDate",
        `bulk-${Date.now()}`,
        null,
        { created },
        { createdCount: created.length, skippedCount: skipped.length },
      );
    }

    revalidatePath("/petitions");

    return NextResponse.json({ created, skipped }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid input", issues: error.flatten() },
        { status: 400 },
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
    }

    console.error("Error bulk creating election dates:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(
  PrivilegeLevel.Admin,
  bulkCreateElectionDatesHandler,
);
