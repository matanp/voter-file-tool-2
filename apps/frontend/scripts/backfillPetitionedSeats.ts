/**
 * One-time backfill: set Seat.isPetitioned on every seat won by petition in a term.
 * Each petitioned membership flags at most one seat, its first; see
 * src/lib/committees/petitionedSeatBackfill.ts for how that seat is chosen.
 *
 * Usage (from apps/frontend):
 *   pnpm db:backfill-petitioned-seats                                # dry run, active term
 *   pnpm db:backfill-petitioned-seats --csv out.csv                  # dry run, write seat list
 *   pnpm db:backfill-petitioned-seats --apply --actor-email admin@example.org
 *   [--term <termId>]  defaults to the active term
 *
 * The database is whatever POSTGRES_PRISMA_URL points at; the script prints its host first.
 * --apply writes one SEAT_PETITIONED_BACKFILLED audit row per changed seat, attributed to
 * the --actor-email user. Rerunning is safe: flagged seats are skipped.
 */

import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env") });
config({ path: path.join(process.cwd(), "..", ".env") });

import prisma from "../src/lib/prisma";
import {
  applyPetitionedSeatBackfill,
  previewPetitionedSeatBackfill,
  type PetitionedSeatBackfillPreview,
} from "../src/lib/committees/petitionedSeatBackfill";

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} needs a value`);
  }
  return value;
}

function databaseHost(): string {
  const url = process.env.POSTGRES_PRISMA_URL;
  if (!url) throw new Error("POSTGRES_PRISMA_URL is not set");
  const parsed = new URL(url);
  return `${parsed.hostname}${parsed.pathname}`;
}

function printPreview(preview: PetitionedSeatBackfillPreview): void {
  const { summary } = preview;
  console.log(`Term: ${preview.termId}`);
  console.log(`Petitioned memberships:    ${summary.petitionedMemberships}`);
  console.log(`Petitioned seats found:    ${summary.petitionedSeats} (one per membership: its first seat)`);
  console.log(`  already flagged:         ${summary.alreadyPetitioned}`);
  console.log(`  to flag:                 ${summary.toFlag}`);
  console.log(`Committees (EDs):          ${summary.committees}`);
  console.log(`Most in one committee:     ${summary.maxPerCommittee}`);
  console.log(
    `First seat chosen by (a seat several memberships chose can count under several): ` +
      `petition ${summary.bySource.petition}, audit ${summary.bySource.audit}, ` +
      `membership ${summary.bySource.membership}`,
  );
  console.log(
    `Later seats of the same memberships, left unflagged: ${summary.passedOverSeats}`,
  );
  const auditOnly = preview.candidates.filter(
    (c) => c.sources.length === 1 && c.sources[0] === "audit",
  ).length;
  console.log(`Seats found only in the audit log: ${auditOnly}`);
  if (preview.missingSeats.length > 0) {
    console.log(
      `WARNING: ${preview.missingSeats.length} petitioned seat numbers have no Seat row (not created):`,
    );
    for (const missing of preview.missingSeats.slice(0, 20)) {
      console.log(
        `  committee ${missing.committeeListId} seat ${missing.seatNumber} (${missing.sources.join(", ")})`,
      );
    }
  }
}

function writeCsv(file: string, preview: PetitionedSeatBackfillPreview): void {
  const header =
    "cityTown,legDistrict,electionDistrict,seatNumber,alreadyPetitioned,evidence";
  const rows = preview.candidates.map((c) =>
    [
      JSON.stringify(c.cityTown),
      c.legDistrict,
      c.electionDistrict,
      c.seatNumber,
      c.alreadyPetitioned,
      c.sources.join("|"),
    ].join(","),
  );
  fs.writeFileSync(file, [header, ...rows].join("\n") + "\n");
  console.log(`Wrote ${rows.length} seats to ${file}`);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const csvPath = argValue("--csv");
  const actorEmail = argValue("--actor-email");

  console.log(`Database: ${databaseHost()}`);

  let termId = argValue("--term");
  if (!termId) {
    const active = await prisma.committeeTerm.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!active) throw new Error("No active term; pass --term");
    termId = active.id;
  }

  if (!apply) {
    const preview = await previewPetitionedSeatBackfill(prisma, termId);
    printPreview(preview);
    if (csvPath) writeCsv(csvPath, preview);
    console.log(
      "\nDry run: nothing changed. Rerun with --apply --actor-email <email>.",
    );
    return;
  }

  if (!actorEmail) throw new Error("--apply needs --actor-email <email>");
  const actor = await prisma.user.findUnique({
    where: { email: actorEmail.trim().toLowerCase() },
    select: { id: true, privilegeLevel: true },
  });
  if (!actor) throw new Error(`No user with email ${actorEmail}`);

  const { flagged, preview } = await applyPetitionedSeatBackfill(
    prisma,
    termId,
    {
      userId: actor.id,
      userRole: actor.privilegeLevel,
    },
  );
  printPreview(preview);
  if (csvPath) writeCsv(csvPath, preview);
  console.log(`\nFlagged ${flagged} seats.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
