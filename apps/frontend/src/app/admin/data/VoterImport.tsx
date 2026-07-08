"use client";

import React, { useState } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  PresignedUploadReportForm,
  type PresignedUploadReportFormSpec,
} from "~/components/admin/PresignedUploadReportForm";
import { type ReportTypeKey } from "@voter-file-tool/shared-validators";

const VOTER_IMPORT_TYPE: ReportTypeKey = "voterImport";

export const voterImportSpec: PresignedUploadReportFormSpec = {
  title: "Voter File Import",
  nameField: {
    id: "voterImportName",
    label: "Import Name",
    placeholder: "e.g., 2025 General Voter File",
    requiredError: "Import name is required",
  },
  fileField: {
    id: "voterFile",
    label: "Voter File (.txt)",
    accept: ".txt",
    chooseLabel: "Choose Voter File",
    requiredError: "Voter file is required",
    readyMessage: "ready for import",
  },
  upload: {
    endpoint: "/api/getVoterFileUploadUrl",
    maxSize: 500 * 1024 * 1024,
  },
  submit: {
    idleLabel: "Upload and Import Voter File",
    generatingLabel: "Starting Import...",
    successMessage:
      "Voter import started successfully! You can track the progress in the Reports page.",
  },
  buildPayload: ({ name, fileKey, fileName }) => ({
    type: VOTER_IMPORT_TYPE,
    name,
    format: "txt",
    fileKey,
    fileName,
  }),
};

export const VoterImport = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [recordEntryNumber, setRecordEntryNumber] = useState(1);

  return (
    <PresignedUploadReportForm
      spec={voterImportSpec}
      renderExtraFields={() => (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(e) =>
                setYear(parseInt(e.target.value) || new Date().getFullYear())
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recordEntryNumber">Record Entry Number</Label>
            <Input
              id="recordEntryNumber"
              type="number"
              min="1"
              value={recordEntryNumber}
              onChange={(e) =>
                setRecordEntryNumber(parseInt(e.target.value) || 1)
              }
              required
            />
          </div>
        </div>
      )}
      validateExtra={() => {
        if (year < 2000 || year > 2100) {
          return "Year must be between 2000 and 2100";
        }
        if (recordEntryNumber < 1) {
          return "Record entry number must be at least 1";
        }
        return null;
      }}
      extendPayload={(base) => ({
        ...base,
        year,
        recordEntryNumber,
      })}
      onSuccessReset={() => {
        setYear(new Date().getFullYear());
        setRecordEntryNumber(1);
      }}
    />
  );
};
