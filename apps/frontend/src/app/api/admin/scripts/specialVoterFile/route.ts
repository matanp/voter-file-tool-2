import fs from "fs";
import readline from "readline";
import { NextApiRequest, NextApiResponse } from "next";
import { NextResponse } from "next/server";

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
    return stringsToMatch.has(columns[0].replace(/"/g, ""));
  });

  fs.writeFileSync(outputFile, filteredRows.join("\n"));
}

export async function POST(req: NextApiRequest, res: NextApiResponse) {
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
        message: err,
      },
      { status: 500 },
    );
  }
}
