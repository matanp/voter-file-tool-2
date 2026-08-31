import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { PrivilegeLevel, type OfficeName } from "@prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "~/lib/prisma";
import { logAuditEvent } from "~/lib/auditLog";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import {
  MAX_BULK_ROWS,
  normalizeOfficeName,
  officeNameMatchKey,
} from "~/lib/electionConfigParsing";

const bulkOfficeNamesSchema = z.object({
  names: z
    .array(z.string().trim().min(1, "Name is required").max(120))
    .min(1, "At least one name is required")
    .max(MAX_BULK_ROWS, `At most ${MAX_BULK_ROWS} names per request`),
});

/**
 * Creates many office names in one request.
 *
 * The client renders a preview, but everything it computed is recomputed here: the cap,
 * the trim-only normalization, the case-insensitive in-batch dedupe and the
 * case-insensitive existing-record precheck. The response is
 * `{ created, skipped }` — there is deliberately no `failed` array, because no execution
 * path can populate one: a row that loses to the precheck is a skip, and a row that
 * collides at the DB is dropped by `skipDuplicates` rather than failing the batch.
 */
async function bulkCreateOfficeNamesHandler(
  request: NextRequest,
  session: SessionWithUser,
) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = bulkOfficeNamesSchema.parse(body);

    const normalized = parsed.names.map(normalizeOfficeName);

    // In-batch dedupe, case-insensitive, first wins.
    const candidates: string[] = [];
    const seen = new Set<string>();
    const skipped: string[] = [];
    for (const name of normalized) {
      const key = officeNameMatchKey(name);
      if (seen.has(key)) {
        skipped.push(name);
        continue;
      }
      seen.add(key);
      candidates.push(name);
    }

    const { created } = await prisma.$transaction(async (tx) => {
      // `in` has no case-insensitive mode in Prisma, so the precheck is an OR of
      // per-name insensitive equals. Bounded by MAX_BULK_ROWS.
      const existing = await tx.officeName.findMany({
        where: {
          OR: candidates.map((name) => ({
            officeName: { equals: name, mode: "insensitive" as const },
          })),
        },
      });
      const existingKeys = new Set(
        existing.map((record) => officeNameMatchKey(record.officeName)),
      );

      const toCreate = candidates.filter(
        (name) => !existingKeys.has(officeNameMatchKey(name)),
      );

      // `skipDuplicates` keys off the case-sensitive DB unique index, so it is a
      // backstop for the race between the precheck and the insert, not a replacement
      // for the case-insensitive precheck above.
      const createdRecords: OfficeName[] =
        toCreate.length > 0
          ? await tx.officeName.createManyAndReturn({
              data: toCreate.map((name) => ({ officeName: name })),
              skipDuplicates: true,
            })
          : [];

      return { created: createdRecords };
    });

    // Anything not in `created` is a skip: either it matched an existing record in the
    // precheck, or it passed the precheck and lost the race to a concurrent insert
    // (Postgres skipped it). Neither is a failure.
    const createdKeys = new Set(
      created.map((record) => officeNameMatchKey(record.officeName)),
    );
    for (const name of candidates) {
      if (!createdKeys.has(officeNameMatchKey(name))) {
        skipped.push(name);
      }
    }

    if (created.length > 0) {
      // Fail-open: election-config bulk adds are reference/config telemetry, not
      // membership state. A failed audit write must not stop an admin loading their
      // office list.
      await logAuditEvent(
        session.user.id,
        session.user.privilegeLevel ?? PrivilegeLevel.Admin,
        "OFFICE_NAMES_BULK_CREATED",
        "OfficeName",
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

    console.error("Error bulk creating office names:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(
  PrivilegeLevel.Admin,
  bulkCreateOfficeNamesHandler,
);
