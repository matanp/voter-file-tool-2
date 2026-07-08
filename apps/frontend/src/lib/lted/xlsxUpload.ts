import * as xlsx from "xlsx";

export type XlsxRow = Record<string, string | number>;

export type UploadFile = {
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type SheetPreference = "first" | "preferNewLtedMatrix";

export type ParseXlsxResult =
  | { ok: true; rows: XlsxRow[] }
  | { ok: false; error: string };

/** Duck-type guard for multipart file uploads with arrayBuffer(). */
export function isUploadFile(value: unknown): value is UploadFile {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function"
  );
}

/** Return the first defined value from a row for the given header keys. */
export function getRowValue(row: XlsxRow, ...keys: string[]): string | number {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return "";
}

/** Select a worksheet from a parsed workbook per sheet preference. */
function selectSheet(
  workbook: xlsx.WorkBook,
  sheetPreference: SheetPreference,
): xlsx.WorkSheet | undefined {
  if (sheetPreference === "preferNewLtedMatrix") {
    return (
      workbook.Sheets.NEW_LTED_Matrix ??
      workbook.Sheets[workbook.SheetNames[0] ?? ""]
    );
  }
  return workbook.Sheets[workbook.SheetNames[0] ?? ""];
}

/** Parse xlsx bytes into JSON rows using the configured sheet preference. */
export function parseXlsxBuffer(
  buf: Buffer,
  options: { sheetPreference: SheetPreference },
): ParseXlsxResult {
  const workbook = xlsx.read(buf);
  const sheet = selectSheet(workbook, options.sheetPreference);

  if (!sheet) {
    return { ok: false, error: "No sheet found in workbook" };
  }

  const rows = xlsx.utils.sheet_to_json<XlsxRow>(sheet);
  return { ok: true, rows };
}

/** Parse an uploaded xlsx file into JSON rows. */
export async function parseXlsxUpload(
  file: UploadFile,
  options: { sheetPreference: SheetPreference },
): Promise<ParseXlsxResult> {
  const buf = Buffer.from(await file.arrayBuffer());
  return parseXlsxBuffer(buf, options);
}
