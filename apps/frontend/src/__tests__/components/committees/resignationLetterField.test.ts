/**
 * Resignation Letter field plumbing (ticket 08): an upload cancelled before
 * its PUT starts, and the field after the server refuses the staged letter.
 */
import { uploadResignationLetter, type ActionOutcome } from "~/app/committees/workspace/adapters";
import type { CommitteeRef } from "~/lib/committees/committeeRef";
import {
  LETTER_REFUSED_FORM_MESSAGE,
  letterAfterSubmit,
  type LetterFieldState,
} from "~/app/committees/workspace/drawer/ResignationLetterField";
import { fetchJsonResponse, installFetchMock } from "../../utils/mocks";

const COMMITTEE: CommitteeRef = {
  committeeListId: 7,
  cityTown: "GREECE",
  legDistrict: 1,
  electionDistrict: 5,
};

describe("uploadResignationLetter", () => {
  afterEach(() => jest.restoreAllMocks());

  it("should not start the PUT when cancelled while the upload URL was being fetched", async () => {
    const controller = new AbortController();
    installFetchMock(() => {
      controller.abort();
      return Promise.resolve(
        fetchJsonResponse({
          uploadUrl: "https://r2.example/put",
          stagingKey: "resignation-letters/staging/m1/k",
          contentType: "application/pdf",
          contentLength: 4,
        }),
      );
    });
    const open = jest.spyOn(XMLHttpRequest.prototype, "open");
    const file = new File(["%PDF"], "letter.pdf", { type: "application/pdf" });

    const result = await uploadResignationLetter(
      { committee: COMMITTEE, memberId: "V1" },
      file,
      jest.fn(),
      controller.signal,
    );

    expect(result.ok).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
});

describe("letterAfterSubmit", () => {
  const ready: LetterFieldState = {
    status: "ready",
    fileName: "letter.pdf",
    staged: { stagingKey: "resignation-letters/staging/m1/k", fileName: "letter.pdf" },
  };

  it("should show the server's reason in the field once it refused the staged letter", () => {
    const after = letterAfterSubmit(ready, {
      ok: false,
      kind: "error",
      message: "The file is over 10 MB.",
      letterRejected: true,
    });
    expect(after.letter).toEqual({ status: "error", message: "The file is over 10 MB." });
    // The form's alert points at the field instead of repeating the reason.
    expect(after.outcome).toMatchObject({ ok: false, message: LETTER_REFUSED_FORM_MESSAGE });
  });

  it("should keep the attached letter after any other failure, for a retry", () => {
    const failed: ActionOutcome = { ok: false, kind: "error", message: "db down" };
    expect(letterAfterSubmit(ready, failed)).toEqual({ letter: ready, outcome: failed });
    const ineligible: ActionOutcome = { ok: false, kind: "ineligible", reasons: [] };
    expect(letterAfterSubmit(ready, ineligible)).toEqual({ letter: ready, outcome: ineligible });
  });
});
