/**
 * Resignation Letter UI (ticket 08): the instructions dialog's fixed letter
 * line, the Admin's Record resignation upload field, and the Pending item's
 * "View letter".
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ExitInstructionsDialog } from "~/app/committees/workspace/drawer/ExitReportForms";
import { RecordResignationForm } from "~/app/committees/workspace/drawer/MemberExitForms";
import { LETTER_REFUSED_FORM_MESSAGE } from "~/app/committees/workspace/drawer/ResignationLetterField";
import { PendingExitReportItem } from "~/app/committees/workspace/tabs/pending/PendingExitReportItem";
import { resetExitInstructionsCache } from "~/app/committees/workspace/adapters";
import type { CommitteeRef } from "~/lib/committees/committeeRef";
import type { PendingExitReport } from "~/lib/validations/committee";
import { fetchJsonResponse, installFetchMock } from "../../utils/mocks";

const COMMITTEE: CommitteeRef = {
  committeeListId: 7,
  cityTown: "GREECE",
  legDistrict: 1,
  electionDistrict: 5,
};
const LETTER = { fileName: "rita-letter.pdf", contentType: "application/pdf" as const };

beforeEach(() => {
  resetExitInstructionsCache();
});

describe("ExitInstructionsDialog letter line", () => {
  beforeEach(() => {
    installFetchMock(() => Promise.resolve(fetchJsonResponse({ text: "Email it to the chair." })));
  });

  it("should say which letter is attached", async () => {
    render(
      <ExitInstructionsDialog open onCancel={jest.fn()} onContinue={jest.fn()} letterFileName="rita.pdf" />,
    );
    expect(await screen.findByTestId("exit-letter-status")).toHaveTextContent(
      "Letter attached: rita.pdf",
    );
    expect(await screen.findByTestId("exit-instructions")).toHaveTextContent("Email it to the chair.");
  });

  it("should say when no letter is attached", async () => {
    render(<ExitInstructionsDialog open onCancel={jest.fn()} onContinue={jest.fn()} letterFileName={null} />);
    expect(await screen.findByTestId("exit-letter-status")).toHaveTextContent("No letter attached");
  });

  it("should leave the line out for a removal", async () => {
    render(<ExitInstructionsDialog open onCancel={jest.fn()} onContinue={jest.fn()} />);
    await screen.findByTestId("exit-instructions");
    expect(screen.queryByTestId("exit-letter-status")).not.toBeInTheDocument();
  });
});

describe("RecordResignationForm", () => {
  it("should offer an optional letter upload and send no letter without one", async () => {
    const fetchMock = installFetchMock(() => Promise.resolve(fetchJsonResponse({ status: "success" })));
    render(
      <RecordResignationForm
        action={{ kind: "record-resignation", committee: COMMITTEE, memberId: "V1" }}
        memberLabel="Rita (V1), seat 3"
        onCancel={jest.fn()}
        onSuccess={jest.fn()}
        Footer={({ children }) => <div>{children}</div>}
      />,
    );
    expect(screen.getByTestId("resignation-letter-field")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Date resignation received/), "2026-11-01");
    await user.click(screen.getByLabelText("Email"));
    await user.click(screen.getByRole("button", { name: "Record resignation" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]!.body)) as Record<string, unknown>;
    expect(body).not.toHaveProperty("letter");
  });
});

describe("RecordResignationForm with a refused letter", () => {
  afterEach(() => jest.restoreAllMocks());

  it("should drop the attached letter and show why when the server refuses it", async () => {
    // The staging PUT succeeds without a network.
    jest.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(() => undefined);
    jest.spyOn(XMLHttpRequest.prototype, "setRequestHeader").mockImplementation(() => undefined);
    jest.spyOn(XMLHttpRequest.prototype, "status", "get").mockReturnValue(200);
    jest.spyOn(XMLHttpRequest.prototype, "send").mockImplementation(function (this: XMLHttpRequest) {
      this.onload?.(new ProgressEvent("load"));
    });
    installFetchMock((input) =>
      Promise.resolve(
        String(input).includes("upload-url")
          ? fetchJsonResponse({
              uploadUrl: "https://r2.example/put",
              stagingKey: "resignation-letters/staging/m1/0f8fad5b-d9cb-469f-a165-70867728950e",
              contentType: "application/pdf",
              contentLength: 4,
            })
          : fetchJsonResponse(
              { status: "error", error: "The file isn't a PDF, JPEG, PNG or HEIC.", letterRejected: true },
              400,
            ),
      ),
    );
    render(
      <RecordResignationForm
        action={{ kind: "record-resignation", committee: COMMITTEE, memberId: "V1" }}
        memberLabel="Rita (V1), seat 3"
        onCancel={jest.fn()}
        onSuccess={jest.fn()}
        Footer={({ children }) => <div>{children}</div>}
      />,
    );

    const user = userEvent.setup();
    await user.upload(
      screen.getByLabelText("Resignation letter (optional)"),
      new File(["%PDF"], "letter.pdf", { type: "application/pdf" }),
    );
    expect(await screen.findByTestId("letter-ready")).toHaveTextContent("letter.pdf");
    await user.type(screen.getByLabelText(/Date resignation received/), "2026-11-01");
    await user.click(screen.getByLabelText("Email"));
    await user.click(screen.getByRole("button", { name: "Record resignation" }));

    const field = screen.getByTestId("resignation-letter-field");
    await waitFor(() =>
      expect(field).toHaveTextContent("The file isn't a PDF, JPEG, PNG or HEIC."),
    );
    expect(screen.queryByTestId("letter-ready")).not.toBeInTheDocument();
    expect(await screen.findByText(LETTER_REFUSED_FORM_MESSAGE)).toBeInTheDocument();
  });
});

describe("PendingExitReportItem letter", () => {
  const report: PendingExitReport = {
    membershipId: "m-rep",
    voterRecordId: "V1",
    firstName: "Rita",
    lastName: "Reported",
    seatNumber: 3,
    kind: "RESIGNATION",
    reportedAt: "2026-10-30T15:04:05.678Z",
    isOwnReport: true,
    letter: LETTER,
  };

  it("should offer View letter to a read-only Leader", () => {
    render(<PendingExitReportItem report={report} canDecide={false} onDecided={jest.fn()} />);
    expect(screen.getByRole("link", { name: /View letter: rita-letter.pdf/ })).toHaveAttribute(
      "href",
      "/api/committee/resignation-letter?membershipId=m-rep&redirect=1",
    );
  });

  it("should show the letter again in the Admin's confirm step", async () => {
    const user = userEvent.setup();
    render(<PendingExitReportItem report={report} canDecide onDecided={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: /Confirm resignation of/ }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Letter attached: rita-letter.pdf");
  });

  it("should say No letter attached when there is none", () => {
    render(
      <PendingExitReportItem report={{ ...report, letter: null }} canDecide={false} onDecided={jest.fn()} />,
    );
    expect(screen.getByTestId("pending-exit-letter")).toHaveTextContent("No letter attached");
  });
});
