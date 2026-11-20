# 18 - Verify Chrome cleanup after a failed PDF render or upload

Status: ready-for-human
Type: task
Blocked by: 20

## Evidence (2026-11-08)

PR #141 wraps PDF generation/upload in `try/finally` and closes the browser. Real sign-in sheet
and committee PDFs completed, uploaded, and called back successfully. A subsequent process check
found no Chrome processes. This verifies the successful path only; failure cleanup is untested.

## Work

- In an isolated test environment, exercise the real `generatePDFAndUpload` function with a
  controlled failure after browser launch (for example page content/render failure).
- Also exercise upload rejection or an unsuccessful upload result.
- Follow `skills/test-type-safety/SKILL.md` before adding tests. Use focused tests for error
  propagation and browser closure, plus a real-browser process check for orphan detection.
- Confirm the error remains observable, browser cleanup occurs, and a subsequent valid report works.
- Avoid breaking production storage credentials or submitting intentionally bad production jobs.

## Acceptance

- Post-launch rendering and upload failures invoke browser cleanup and surface a failure.
- Real-browser verification leaves no additional Chrome processes after failure settles.
- A subsequent valid PDF succeeds; capture test output and before/after process evidence.
- Launch failure does not attempt to close a browser that was never created.

Related: [04](04-install-runs-out-of-memory.md).

## Comments

### 2026-11-19: unit coverage in PR #148; box check folded into 20

PR #148 bounds `browser.close()` (10 s, then SIGKILL of Chrome's process group) and adds tests for a failed `newPage()`,
a hanging `close()` and a rejecting `close()`, with the report keeping its original error. Ticket 20's failure scenarios
run the real-browser orphan check on the box, and its acceptance closes this ticket. Upload-rejection cleanup is still
only covered by the `try/finally` from PR #141; confirm 20's scenarios include it.
