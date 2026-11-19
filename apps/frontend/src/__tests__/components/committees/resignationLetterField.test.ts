/**
 * Resignation Letter field plumbing (ticket 08): an upload cancelled before
 * its PUT starts, and the field after the server refuses the staged letter.
 */
import { uploadResignationLetter } from "~/app/committees/workspace/adapters";
import type { CommitteeRef } from "~/app/committees/workspace/committeeAction";
import {
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

  it("should show the server's reason once it refused the staged letter", () => {
    expect(
      letterAfterSubmit(ready, {
        ok: false,
        kind: "error",
        message: "The file is over 10 MB.",
        letterRejected: true,
      }),
    ).toEqual({ status: "error", message: "The file is over 10 MB." });
  });

  it("should keep the attached letter after any other failure, for a retry", () => {
    expect(letterAfterSubmit(ready, { ok: false, kind: "error", message: "db down" })).toBe(ready);
    expect(letterAfterSubmit(ready, { ok: false, kind: "ineligible", reasons: [] })).toBe(ready);
  });
});
