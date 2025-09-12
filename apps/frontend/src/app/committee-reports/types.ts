import type { VoterRecordField } from "@voter-file-tool/shared-validators";

export interface XLSXConfigFormData {
  name: string;
  description: string;
  format: "pdf" | "xlsx";
  includeFields: VoterRecordField[];
  includeCompoundFields: {
    name: boolean;
    address: boolean;
  };
  columnOrder: string[];
  columnHeaders: Record<string, string>;
  autoDownload: boolean;
}

export const DEFAULT_FORM_DATA: XLSXConfigFormData = {
  name: "",
  description: "",
  format: "xlsx",
  includeFields: [],
  includeCompoundFields: {
    name: true,
    address: true,
  },
  columnOrder: [],
  columnHeaders: {},
  autoDownload: true,
};
