import type { EligibilityFlagListItem } from "./EligibilityFlagReviewDialog";

// `details` shapes are written by detectFlagsForMembership in
// packages/shared-prisma/src/boeEligibilityFlagging.ts. Older flags may have
// null details, so each field is read defensively.

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function readText(value: unknown): string | null {
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

function formatImportVersion(value: unknown): string | null {
  const version = asObject(value);
  if (!version) return null;
  const year = readText(version.year);
  const recordEntryNumber = readText(version.recordEntryNumber);
  if (!year) return null;
  return recordEntryNumber ? `${year} #${recordEntryNumber}` : year;
}

/** One-line description of what the flag found, e.g. "Committee AD: 136 · Voter's AD: 135". */
export function summarizeEligibilityFlag(
  flag: EligibilityFlagListItem,
): string {
  const details = asObject(flag.details);
  const voter = flag.membership.voterRecord;

  switch (flag.reason) {
    case "ASSEMBLY_DISTRICT_MISMATCH": {
      // Present but null means the committee has no crosswalk row; absent
      // means the flag predates details being recorded.
      const committeeAd =
        details && "expectedAssemblyDistrict" in details
          ? (readText(details.expectedAssemblyDistrict) ??
            "unknown (no crosswalk row)")
          : "not recorded";
      const voterAd =
        (details && "voterAssemblyDistrict" in details
          ? readText(details.voterAssemblyDistrict)
          : readText(voter?.stateAssmblyDistrict)) ?? "none on file";
      return `Committee AD: ${committeeAd} · Voter's AD: ${voterAd}`;
    }
    case "PARTY_MISMATCH": {
      const requiredParty =
        readText(details?.expectedPartyCode) ?? "not recorded";
      const voterParty =
        (details && "voterPartyCode" in details
          ? readText(details.voterPartyCode)
          : readText(voter?.party)) ?? "none on file";
      return `Required party: ${requiredParty} · Voter's party: ${voterParty}`;
    }
    case "POSSIBLY_INACTIVE": {
      const voterVersion =
        formatImportVersion(details?.voterVersion) ?? "unknown";
      const mostRecentImport =
        formatImportVersion(details?.mostRecentImport) ?? "unknown";
      return `Voter's latest import: ${voterVersion} · Most recent import: ${mostRecentImport}`;
    }
    case "VOTER_NOT_FOUND":
      return (
        readText(details?.message) ??
        "Voter record was not found for this membership."
      );
  }
}
