import React from "react";
import { render, screen } from "@testing-library/react";
import {
  PresignedUploadReportForm,
  type PresignedUploadReportFormSpec,
} from "~/components/admin/PresignedUploadReportForm";

const spec: PresignedUploadReportFormSpec = {
  title: "Upload",
  nameField: {
    id: "report-name",
    label: "Report name",
    placeholder: "Name",
    requiredError: "Name required",
  },
  fileField: {
    id: "upload-file",
    label: "File",
    accept: ".csv",
    chooseLabel: "Choose file",
    requiredError: "File required",
    readyMessage: "ready",
  },
  upload: { endpoint: "/api/upload", maxSize: 1024 },
  submit: {
    idleLabel: "Generate",
    generatingLabel: "Generating",
    successMessage: "Done",
  },
  buildPayload: ({ name, fileKey }) => ({ name, fileKey }),
};

describe("PresignedUploadReportForm", () => {
  // jsdom has no layout, so guard the class contract that caused the page
  // overflow: width/padding utilities on the sr-only input override its 1px
  // box, and without a positioned ancestor it spans the viewport.
  it("keeps the hidden file input visually contained", () => {
    render(<PresignedUploadReportForm spec={spec} />);

    const input = screen.getByLabelText("File");
    expect(input).toHaveAttribute("type", "file");
    expect(input.className).toBe("sr-only");
    expect(input.parentElement).toHaveClass("relative");
  });
});
