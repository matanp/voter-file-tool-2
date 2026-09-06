import {
  BOE_ELECTED_LIST_FORMAT_ID,
  boeElectedListFormat,
} from "./boeElectedList";
import {
  COMMITTEE_EXPORT_XLSX_FORMAT_ID,
  committeeExportXlsxFormat,
} from "./committeeExportXlsx";
import type { RosterFormatId as ContractRosterFormatId } from "@voter-file-tool/shared-validators";
import type { RosterFormat, RosterParseResult } from "./types";

export * from "./types";

/**
 * Every roster file format the importer can read, one plain parser each. Adding support
 * for a future Board of Elections delivery means writing a parser and registering it
 * here — reconciliation and discrepancy logic never learn what a column is called.
 *
 * The keys are pinned to the identifiers the shared API contract declares, so a parser
 * registered without being named in the contract (or named there without a parser) is a
 * compile error rather than a runtime surprise.
 */
export const ROSTER_FORMATS = {
  [BOE_ELECTED_LIST_FORMAT_ID]: boeElectedListFormat,
  [COMMITTEE_EXPORT_XLSX_FORMAT_ID]: committeeExportXlsxFormat,
} as const satisfies Record<ContractRosterFormatId, RosterFormat>;

export type RosterFormatId = keyof typeof ROSTER_FORMATS;

export const ROSTER_FORMAT_IDS = Object.keys(
  ROSTER_FORMATS,
) as RosterFormatId[];

/** Format identifiers an Admin may import through the API. */
export const CURRENT_ROSTER_FORMAT_IDS = ROSTER_FORMAT_IDS.filter(
  (id) => ROSTER_FORMATS[id].status === "current",
);

export function isRosterFormatId(value: string): value is RosterFormatId {
  return Object.prototype.hasOwnProperty.call(ROSTER_FORMATS, value);
}

export function parseWithFormat(
  formatId: RosterFormatId,
  fileContents: Buffer,
): RosterParseResult {
  return ROSTER_FORMATS[formatId].parse(fileContents);
}
