"use client";

import React from "react";
import {
  PresignedUploadReportForm,
  type PresignedUploadReportFormSpec,
} from "~/components/admin/PresignedUploadReportForm";
import { type ReportTypeKey } from "@voter-file-tool/shared-validators";

const ABSENTEE_REPORT_TYPE: ReportTypeKey = "absenteeReport";

export const absenteeReportSpec: PresignedUploadReportFormSpec = {
  title: "Absentee Ward/Town Report",
  nameField: {
    id: "absenteeReportName",
    label: "Report Name",
    placeholder: "Report name",
    requiredError: "Report name is required",
  },
  fileField: {
    id: "csvFile",
    label: "CSV File",
    accept: ".csv",
    chooseLabel: "Choose CSV File",
    requiredError: "CSV file is required",
    readyMessage: "ready for processing",
  },
  upload: {
    endpoint: "/api/getCsvUploadUrl",
    maxSize: 50 * 1024 * 1024,
  },
  submit: {
    idleLabel: "Upload File and Generate Report",
    generatingLabel: "Generating...",
    successMessage: "Report generation started successfully!",
  },
  buildPayload: ({ name, fileKey }) => ({
    type: ABSENTEE_REPORT_TYPE,
    name,
    format: "xlsx",
    csvFileKey: fileKey,
  }),
};

export const AbsenteeReport = () => (
  <PresignedUploadReportForm spec={absenteeReportSpec} />
);
