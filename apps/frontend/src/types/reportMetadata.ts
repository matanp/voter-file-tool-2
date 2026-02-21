import { ReportType } from "@prisma/client";
import { type VoterImportMetadata } from "@voter-file-tool/shared-validators";

// Future report metadata types can be added here
// export interface AbsenteeReportMetadata { ... }
// export interface CommitteeReportMetadata { ... }

// Map report types to their metadata types (explicit documentation)
export type ReportMetadataMap = {
  [ReportType.VoterImport]: VoterImportMetadata;
  [ReportType.CommitteeReport]: null;
  [ReportType.DesignatedPetition]: null;
  [ReportType.VoterList]: null;
  [ReportType.AbsenteeReport]: null;
  [ReportType.SignInSheet]: null;
};

// Helper type to get metadata for a specific report type
export type MetadataForReportType<T extends ReportType> = ReportMetadataMap[T];

// Type guard for voter import metadata
export function isVoterImportMetadata(
  metadata: unknown,
  reportType: ReportType,
): metadata is VoterImportMetadata {
  return (
    reportType === ReportType.VoterImport &&
    metadata !== null &&
    typeof metadata === "object" &&
    "recordsProcessed" in metadata &&
    typeof (metadata as Record<string, unknown>).recordsProcessed ===
      "number" &&
    "recordsCreated" in metadata &&
    typeof (metadata as Record<string, unknown>).recordsCreated === "number" &&
    "recordsUpdated" in metadata &&
    typeof (metadata as Record<string, unknown>).recordsUpdated === "number" &&
    "dropdownsUpdated" in metadata &&
    typeof (metadata as Record<string, unknown>).dropdownsUpdated === "boolean"
  );
}

// Re-export for convenience
export type { VoterImportMetadata };
