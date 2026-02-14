import fs from "fs";
import readline from "readline";
import { NextResponse, type NextRequest } from "next/server";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";

async function filterCsvRows(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  const inputStringsFile = "data/committeeVRCNUMs.txt";
  const csvFile = "data/2024_5_2_voter_records.txt";
  const outputFile = "data/2024_5_2_voter_records_filtered.txt";

  const stringsToMatch = new Set<string>();
  const rl = readline.createInterface({
    input: fs.createReadStream(inputStringsFile),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    stringsToMatch.add(line.trim());
  }

  const csvData = fs.readFileSync(csvFile, "utf8");
  const rows = csvData.split("\n");
  const filteredRows = rows.filter((row) => {
    const columns = row.split(",");
    if (columns[0]) {
      return stringsToMatch.has(columns[0].replace(/"/g, ""));
    }
  });

  fs.writeFileSync(outputFile, filteredRows.join("\n"));
}

async function specialVoterFileHandler(
  _req: NextRequest,
  _session: Session,
) {
  try {
    await filterCsvRows();
    return NextResponse.json(
      {
        success: true,
        message: "Data loaded successfully.",
        result: "",
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json(
      {
        success: false,
        message: String(err),
      },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(
  PrivilegeLevel.Admin,
  specialVoterFileHandler,
);
