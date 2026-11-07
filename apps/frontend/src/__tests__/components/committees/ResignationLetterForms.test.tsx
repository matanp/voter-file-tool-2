/**
 * Resignation Letter UI (ticket 08): the instructions dialog's fixed letter
 * line, the Admin's carry-over checkbox (ticked by default), the removal
 * warning, and the Pending item's "View letter".
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ExitInstructionsDialog } from "~/app/committees/workspace/drawer/ExitReportForms";
import {
  RecordResignationForm,
  RemoveMemberForm,
} from "~/app/committees/workspace/drawer/MemberExitForms";
import { PendingExitReportItem } from "~/app/committees/workspace/tabs/pending/PendingExitReportItem";
import { resetExitInstructionsCache } from "~/app/committees/workspace/adapters";
import type { CommitteeRef } from "~/app/committees/workspace/committeeAction";
import type { PendingExitReport } from "~/lib/validations/committee";
import { fetchJsonResponse, installFetchMock } from "../../utils/mocks";

const COMMITTEE: CommitteeRef = {
  committeeListId: 7,
  cityTown: "GREECE",
  legDistrict: 1,
  electionDistrict: 5,
};
const PENDING_LETTER = {
  membershipId: "m-rep",
  letter: { fileName: "rita-letter.pdf", contentType: "application/pdf" as const },
};

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

describe("RecordResignationForm with a pending letter", () => {
  const Footer = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

  async function fillAndSubmit() {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Date resignation received/), "2026-11-01");
    await user.click(screen.getByLabelText("Email"));
    return user;
  }

  it("should keep the Leader's letter by default, and send keepReportedLetter", async () => {
    const fetchMock = installFetchMock(() => Promise.resolve(fetchJsonResponse({ status: "success" })));
    render(
      <RecordResignationForm
        action={{ kind: "record-resignation", committee: COMMITTEE, memberId: "V1" }}
        memberLabel="Rita (V1), seat 3"
        onCancel={jest.fn()}
        onSuccess={jest.fn()}
        pendingLetter={PENDING_LETTER}
        Footer={Footer}
      />,
    );
    const keep = screen.getByRole("checkbox", { name: /Keep the letter the Leader attached/ });
    expect(keep).toBeChecked();
    expect(screen.getByRole("link", { name: /View: rita-letter.pdf/ })).toHaveAttribute(
      "href",
      "/api/committee/resignation-letter?membershipId=m-rep&redirect=1",
    );

    const user = await fillAndSubmit();
    await user.click(screen.getByRole("button", { name: "Record resignation" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]!.body)) as Record<string, unknown>;
    expect(body.keepReportedLetter).toBe(true);
  });

  it("should not send keepReportedLetter once unticked", async () => {
    const fetchMock = installFetchMock(() => Promise.resolve(fetchJsonResponse({ status: "success" })));
    render(
      <RecordResignationForm
        action={{ kind: "record-resignation", committee: COMMITTEE, memberId: "V1" }}
        memberLabel="Rita (V1), seat 3"
        onCancel={jest.fn()}
        onSuccess={jest.fn()}
        pendingLetter={PENDING_LETTER}
        Footer={Footer}
      />,
    );
    const user = await fillAndSubmit();
    await user.click(screen.getByRole("checkbox", { name: /Keep the letter/ }));
    await user.click(screen.getByRole("button", { name: "Record resignation" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]!.body)) as Record<string, unknown>;
    expect(body).not.toHaveProperty("keepReportedLetter");
  });

  it("should offer no carry-over without a pending letter", () => {
    render(
      <RecordResignationForm
        action={{ kind: "record-resignation", committee: COMMITTEE, memberId: "V1" }}
        memberLabel="Rita (V1), seat 3"
        onCancel={jest.fn()}
        onSuccess={jest.fn()}
        Footer={Footer}
      />,
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByTestId("resignation-letter-field")).toBeInTheDocument();
  });
});

describe("RemoveMemberForm with a pending letter", () => {
  it("should warn that the Leader's letter won't be kept", () => {
    render(
      <RemoveMemberForm
        action={{ kind: "remove-member", committee: COMMITTEE, memberId: "V1" }}
        memberLabel="Rita (V1), seat 3"
        onCancel={jest.fn()}
        onSuccess={jest.fn()}
        pendingLetter={PENDING_LETTER}
        Footer={({ children }) => <div>{children}</div>}
      />,
    );
    expect(screen.getByTestId("removal-letter-warning")).toHaveTextContent(
      "The Leader's letter will not be kept with a removal.",
    );
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
    letter: PENDING_LETTER.letter,
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
