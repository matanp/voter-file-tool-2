import { NextResponse } from "next/server";
import { parseCSV } from "./bulkLoadUtils";

export async function POST() {
  console.log("Loading data BULK");
  console.time("loadData");

  try {
    const files = ["2024_5_2_voter_records.txt"];

    // const files = ["2024_1_voter_records-partial25000.txt"];

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
