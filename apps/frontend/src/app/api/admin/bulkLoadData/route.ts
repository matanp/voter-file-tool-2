import { NextResponse } from "next/server";
import { parseCSV } from "./bulkLoadUtils";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

async function bulkLoadDataHandler(_req: NextRequest, _session: Session) {
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "Not available in this environment" },
      { status: 503 },
    );
  }

  console.log("Loading data BULK");
  console.time("loadData");

  try {
    const files = ["2024_5_2_voter_records.txt"];
    const years = [2024];
    const recordEntryNumbers = [1];

    for (let i = 0; i < files.length; i++) {
      console.log(files[i] ?? "", years[i] ?? 0, recordEntryNumbers[i] ?? 0);
      await parseCSV(
        `data/${files[i]}`,
        years[i] ?? 0,
        recordEntryNumbers[i] ?? 0,
      );
    }

    console.log("Parsing complete");
    console.timeEnd("loadData");

    return NextResponse.json(
      {
        success: true,
        message: "Data loaded successfully.",
        result: "",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error loading data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
        message: "Failed to load data.",
      },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, bulkLoadDataHandler);
