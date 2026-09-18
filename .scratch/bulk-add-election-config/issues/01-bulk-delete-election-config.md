# 01 - Bulk delete for election offices and dates

Status: needs-triage

Deferred from `.scratch/bulk-add-election-config/spec.md`.

Bulk add makes it easy to create 50 office names in one paste, which makes "delete 50
rows one at a time" the next pain point. The current list is a plain `<ul>` with a
per-row Delete button and no confirmation dialog.

Deliberately not bundled with bulk add. The original reason — that petition and report
data might point at these records — turned out not to hold (see below), so what keeps this
separate now is the UX design, not the data risk.

Still `needs-triage`: the open questions are about interaction design, not safety.

- ~~What actually references `OfficeName` / `ElectionDate`?~~ **Answered 2026-08-30 in
  `03`: nothing does.** No inbound FK, and nothing persists a chosen value — the petition
  form copies it into a transient report payload that is printed into a PDF, and the
  `Report` row keeps only `fileKey` / `title` / `description`. Petition outcomes attach to
  `Seat`, not to these. Deleting an entry changes only what future dropdowns offer; it
  cannot orphan a record, and already-generated PDFs are immutable. The premise that made
  delete "meaningfully riskier" than create is therefore gone.
- Multi-select checkboxes on the list, or a paste-a-list-to-delete flow mirroring bulk add?
- Confirmation UX, given there is no confirmation on single delete today either.
- Audit logging for deletes (the existing single-delete route logs nothing).
