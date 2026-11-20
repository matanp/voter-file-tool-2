/**
 * One-time backfill: move voter calendar dates stored at a US local midnight to UTC midnight.
 *
 * Until the voter import parsed mm/dd/yyyy as UTC (voterRecordProcessor.ts
 * convertStringToDateTime), it stored midnight in the importing machine's zone. Prod has ~2.5% of
 * rows from a Pacific machine: 07:00Z (PDT), 08:00Z (PST), 07:52:58Z (LA local mean time, before
 * 1883).
 *
 * Rule: a time of day strictly between 00:00 and 10:00 is truncated to its UTC day. Only a zone
 * west of UTC (UTC-0:01 to UTC-10) puts local midnight there, and those all land on the intended
 * calendar day in UTC. That covers every mainland US zone, including local mean time. A time at or
 * after 10:00 could be midnight in a zone east of UTC (UTC+14 is 10:00Z the previous day), where
 * truncating would lock in the wrong day. Those rows are counted, listed, and left alone.
 *
 * Usage (from apps/frontend):
 *   pnpm db:backfill-voter-dates-utc            # dry run: counts per column and time of day
 *   pnpm db:backfill-voter-dates-utc --apply    # rewrite the matching rows
 *   [--batch-size <n>]                          # rows scanned per UPDATE, default 10000
 *
 * The database is whatever POSTGRES_PRISMA_URL points at; the script prints its host first.
 *
 * Run order: deploy the UTC import first, then run this, and don't run an import at the same time.
 * Each table is walked in primary-key batches. Each batch is one UPDATE that fixes DOB,
 * originalRegDate and lastUpdate together and commits on its own, so locks stay short. Rerunning
 * is safe (fixed rows sit at 00:00:00 and no longer match), including after a partial failure.
 * VACUUM ANALYZE the two tables afterward.
 */

import * as path from "path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env") });
config({ path: path.join(process.cwd(), "..", ".env") });

import prisma from "../src/lib/prisma";

const TABLES = [
  { name: "VoterRecord", key: "VRCNUM" },
  { name: "VoterRecordArchive", key: "id" },
] as const;
const COLUMNS = ["DOB", "originalRegDate", "lastUpdate"] as const;

/** The one rule, used by both the dry-run counts and the UPDATE. */
const fixable = (column: string) =>
  `("${column}"::time > '00:00:00'::time AND "${column}"::time < '10:00:00'::time)`;

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

type Bucket = { time_of_day: string; kind: "ok" | "fix" | "left alone"; rows: bigint };

async function countColumn(table: string, column: string): Promise<Bucket[]> {
  return prisma.$queryRawUnsafe<Bucket[]>(`
    SELECT to_char("${column}", 'HH24:MI:SS.MS') AS time_of_day,
           CASE WHEN "${column}"::time = '00:00:00'::time THEN 'ok'
                WHEN ${fixable(column)} THEN 'fix'
                ELSE 'left alone' END AS kind,
           count(*) AS rows
    FROM "${table}"
    WHERE "${column}" IS NOT NULL
    GROUP BY 1, 2
    ORDER BY 3 DESC
  `);
}

/** Walks the table by primary key; returns the number of rows changed. */
async function fixTable(
  table: string,
  key: string,
  batchSize: number,
): Promise<number> {
  const setClause = COLUMNS.map(
    (c) =>
      `"${c}" = CASE WHEN ${fixable(c)} THEN date_trunc('day', "${c}") ELSE "${c}" END`,
  ).join(",\n        ");
  const anyFixable = COLUMNS.map(fixable).join(" OR ");

  let cursor: string | number | null = null;
  let changed = 0;
  for (;;) {
    // Upper key of the next batch; null once the table is exhausted.
    const rows: { upper: string | number | null }[] =
      await prisma.$queryRawUnsafe(
        `
      SELECT max(k) AS upper FROM (
        SELECT "${key}" AS k FROM "${table}"
        ${cursor === null ? "" : `WHERE "${key}" > $1`}
        ORDER BY "${key}" LIMIT ${batchSize}
      ) batch
      `,
        ...(cursor === null ? [] : [cursor]),
      );
    const upper = rows[0]?.upper ?? null;
    if (upper === null) break;

    const params: (string | number)[] =
      cursor === null ? [upper] : [cursor, upper];
    const range =
      cursor === null ? `"${key}" <= $1` : `"${key}" > $1 AND "${key}" <= $2`;
    changed += await prisma.$executeRawUnsafe(
      `
      UPDATE "${table}"
      SET ${setClause}
      WHERE ${range} AND (${anyFixable})
      `,
      ...params,
    );
    cursor = upper;
  }
  return changed;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const batchSize = Number(argValue("--batch-size") ?? 10000);
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("--batch-size must be a positive integer");
  }

  console.log(`Database: ${databaseHost()}`);
  console.log(apply ? "Mode: APPLY\n" : "Mode: dry run (pass --apply to write)\n");

  let leftAlone = 0;
  for (const table of TABLES) {
    let tableToFix = 0;
    for (const column of COLUMNS) {
      const buckets = await countColumn(table.name, column);
      const total = buckets.reduce((sum, b) => sum + Number(b.rows), 0);
      console.log(`${table.name}.${column}: ${total} non-null rows`);
      for (const b of buckets) {
        if (b.kind === "fix") tableToFix += Number(b.rows);
        if (b.kind === "left alone") leftAlone += Number(b.rows);
        console.log(
          `  ${b.time_of_day}  ${String(b.rows).padStart(10)}  ${b.kind}`,
        );
      }
    }
    console.log(`${table.name}: ${tableToFix} column values to fix`);

    if (apply && tableToFix > 0) {
      console.time(`${table.name} update`);
      const changed = await fixTable(table.name, table.key, batchSize);
      console.timeEnd(`${table.name} update`);
      console.log(`${table.name}: ${changed} rows updated`);
    }
    console.log();
  }

  if (leftAlone > 0) {
    console.log(
      `${leftAlone} values at 10:00 or later were not touched. ` +
        `Their stored day may be wrong; check them by hand or re-import.`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
