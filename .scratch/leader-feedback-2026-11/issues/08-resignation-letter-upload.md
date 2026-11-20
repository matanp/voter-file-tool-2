# 08 - Resignation letter upload

Status: resolved

Blocked by: 01 (resolved, PR #135)

## Ask (verbatim, from item 1)

> Ideally, include a place for them to upload a resignation letter; at minimum, add a pop-up telling them to send it to Stephen and me, editable on the admin side so we can change the process if needed.

Ticket 01 covers the "at minimum" part: a Leader exit report plus admin-editable instructions. This ticket is the
"ideally" part. It was split out on 2026-11-01.

## What exists today

- Files live in **Cloudflare R2**, not AWS S3. `src/lib/s3Utils.ts` points the S3 SDK at R2 and uses one bucket
  (`R2_BUCKET_NAME`) for generated reports and Admin CSV uploads. It has `getPresignedUploadUrl` (signs the
  content type but **not** the length, 1-hour default expiry) and `getPresignedReadUrl`.
- `api/getCsvUploadUrl` (Admin-only) checks the file name, type and size the _client says_ it has. The upload
  goes straight to R2 and nothing checks the actual bytes. That's acceptable for Admins, not for Leaders.
- 01's Exit Report stores the reported exit on the member's `CommitteeMembership` row. Rejecting clears every
  report and exit field (01 decision 6). Admins confirm or reject, never edit (01 decision 19). Every exit
  write goes through `writeMembershipExit` (`src/app/api/lib/membershipExit.ts`).

## Decisions (grilled 2026-11-02)

1. **Scope.** An optional letter upload on the Leader's **resignation** Exit Report and on the Admin's direct
   **Record resignation** form. Removals get no upload.
2. **One file per exit.** The file can be replaced before submitting. Stored as one column, not a child table.
3. **Types and size.** PDF, JPEG, PNG, HEIC, at most 10 MB. No Word documents. HEIC is stored as-is and served as
   a download only (no inline preview).
4. **Who can view.**
   - Admins: always.
   - While the report is pending: anyone with jurisdiction over the committee (the same people who see the
     Pending tab read-only, 01 decision 17).
   - Once confirmed (RESIGNED): Admins only. The letter holds the member's signature and personal details.
5. **Rejected or superseded unconfirmed letters** are cleared from the row. The file stays under
   `resignation-letters/<membershipId>/`, so one rejected by mistake can still be found there. _(Simplified
   2026-11-16: originally moved to a 90-day `rejected/` prefix, with the key in the audit metadata.)_
6. **Confirmed letters are kept indefinitely,** like membership history and the audit log. Revisit if the party
   adopts a records-retention policy.
7. **Optional for both Leaders and Admins.** The method (Email / Mail) is still required. An Admin can reject a
   report that arrives without a letter.
8. **Instructions pop-up.** It stays one admin-editable text; the Admin rewrites it as needed (e.g. "upload it,
   or email it to …"). The dialog also shows a fixed line, "Letter attached: _name.pdf_" or "No letter
   attached".
9. **Upload mechanics: presigned PUT with checks at submit.**
   - A new presign endpoint (RequestAccess+, with jurisdiction over the membership's committee) signs
     `ContentType` **and** `ContentLength`, with a 5-minute expiry. It rejects declared types and sizes outside
     decision 3.
   - At submit, the server checks the real object: its size via `HeadObject`, and its type from the first bytes
     (a ranged GET; the magic bytes for PDF / JPEG / PNG / HEIC). On failure it deletes the object and returns 400.
10. **Staging.** Presigned uploads go to `resignation-letters/staging/<membershipId>/<uuid>`. A 1-day lifecycle
    rule clears staging. At submit the server checks the key is under **that membership's** staging prefix, then
    copies the object to `resignation-letters/<membershipId>/<uuid>.<ext>` and deletes the staging copy.
    _(Simplified 2026-11-16: originally an HMAC token also bound the upload to the submitting user.)_
11. **Same bucket, under the `resignation-letters/` prefix.** Before shipping, confirm in the Cloudflare
    dashboard that the bucket has **no public access** (no r2.dev URL, no public custom domain). This can't be
    checked from the repo; Terraform doesn't manage the bucket. If it is public, stop and ask.
12. **Late letters: dropped (2026-11-16).** There is no Attach / replace action on a RESIGNED membership. Add it
    when an Admin asks. Leaders can't attach to or replace a letter on a pending report (01 decision 8).
13. **Views aren't logged.** The read endpoint checks access (decision 4) and returns a 5-minute presigned GET URL.
    Uploads are audited (the letter key in the exit's audit metadata).
14. **Carry-over on a direct Admin resignation.** If a member has a pending resignation report with a letter and
    an Admin uses **Record resignation** instead of Confirm, the letter is kept, unless the Admin uploads their own,
    which replaces it. Every other superseding path (removal, flag confirm, replacement accept, bulk sync, undo)
    clears it. _(Simplified 2026-11-16: originally a "Keep the letter" checkbox, a removal warning, and
    `letterCarriedOver` in the audit.)_

15. **Reactivation.** When a RESIGNED member is reactivated (re-add, resubmit, discrepancy accept, bulk-import
    reactivation, petition outcome), the row's letter columns are cleared and the file **stays** in
    `resignation-letters/<membershipId>/`.
16. **Where "View letter" appears:**
    - on the Pending tab's Exit Report item (Admins; Leaders read-only while pending);
    - on the Admin's Confirm step, so they can read it before confirming;
    - in the member drawer and Committee History entry for a RESIGNED membership (Admins only).

    PDF and images open inline in a new tab. HEIC downloads.

17. **Serving safety.** Every presigned GET sets `ResponseContentType` to the type sniffed at upload (stored on
    the row, not taken from the client) and `ResponseContentDisposition` (`inline` for PDF / JPEG / PNG,
    `attachment` for HEIC). The objects are written with `nosniff`-safe content types. No AV scan for now.
18. **Ticket 09 is out of scope** (see the note there). Build the upload as a reusable form field plus the
    helper's `letter` option, so 09 can reuse both.

## Model

On `CommitteeMembership`:

- `resignationLetterKey String?`: the R2 key under `resignation-letters/<membershipId>/`.
- `resignationLetterContentType String?`: the type sniffed at submit.
- `resignationLetterFileName String?`: the original name, sanitized with `sanitizeForS3Key`, for display only.
- Optional: `resignationLetterUploadedById` / `resignationLetterUploadedAt`, if the audit log isn't enough for
  the "uploaded by" line. This is the implementer's call.
- Same lifecycle rule as the four exit fields. While ACTIVE with `exitReportedAt` set, the letter belongs to the
  _reported_ exit. Once RESIGNED, it belongs to the _recorded_ exit.
- DB check (raw SQL, next to 01's checks):
  - a letter key may be set only when `status = 'RESIGNED'`, or when `status = 'ACTIVE' AND exitReportedKind = 'RESIGNATION'`;
  - key and content type are set together.

### Shared exit helper

Every write in `membershipExit.ts` clears the letter columns unless `writeMembershipExit` is given an optional
`letter`:

- `"keepReported"`: keeps the pending report's letter (confirm; an Admin's Record resignation).
- `{ key, contentType, fileName }`: a newly uploaded letter (the Admin's Record resignation with an upload).

Reject (01), removals and every other exit clear it with no code at the call site. Reactivation paths clear the
columns themselves (decision 15). No R2 call happens after the transaction.

## Flows

### Leader reports a resignation with a letter

1. In the Exit Report drawer, with kind = Resignation, an optional file field appears.
2. Picking a file calls the presign endpoint, then PUTs to staging, showing progress. The Leader can replace the
   file or remove it.
3. The instructions dialog shows the admin text plus "Letter attached: …" or "No letter attached".
4. Submit sends the staging key. The server checks its prefix, the size and type, copies the file into the
   membership's prefix, and writes the columns along with the report. `MEMBER_EXIT_REPORTED` metadata includes
   the letter key.

### Admin resolves

- **Confirm:** the inline confirm step shows "View letter". Confirming keeps the letter (`letter: "keep"`).
- **Reject:** clears the letter (decision 5).
- **Record resignation on a member with a pending letter:** keeps it unless the Admin uploads one (decision 14).
- **Record resignation with no pending report:** an optional upload field. The Admin uses the same presign,
  staging and check flow.

### Viewing

- `GET /api/committee/resignation-letter?membershipId=…` (name is the implementer's call) checks access as in
  decision 4, using actual privilege, and returns `{ url }` (a 5-minute presigned GET, decision 17).

## Infrastructure

- R2 lifecycle rule: `resignation-letters/staging/` expires after 1 day. They're set in the Cloudflare dashboard (not in Terraform today), so write a ticket with instructions for Matan to setup.
- Check that the bucket has no public access (decision 11), again as a ticket for Matan.

## Domain docs

- `CONTEXT.md`, under Committee records: **Resignation Letter**: "The file a member's resignation came in, attached
  to a resignation Exit Report or to an Admin's recorded resignation. Kept indefinitely once the resignation is
  recorded."
- Add to 01's ADR (or write a short new one): letters live on the membership row, are written only through
  `writeMembershipExit`'s `letter` option, and follow the retention rules in decisions 5, 6 and 15.

## Out of scope

- Letters on removals.
- Letters on replacements (ticket 09; it should reuse this ticket's field and helper option).
- Several files per exit, Word documents, HEIC-to-JPEG conversion.
- AV scanning, write a ticket for this, but not prioritized.
- Logging letter views.
- Leader edits to a pending report's letter (no edit, per 01 decision 8; withdraw is ticket 10).

## Acceptance criteria

- [ ] A Leader can attach one PDF / JPEG / PNG / HEIC file (≤ 10 MB) to a resignation Exit Report, or submit without one.
- [ ] Removal reports have no upload field, and the API rejects a letter on a removal report.
- [ ] A file whose real size or first bytes don't match decision 3 is rejected at submit and deleted from R2, even when the declared type and size were valid.
- [ ] A staging key issued for another membership (or expired) is refused.
- [ ] The instructions dialog shows whether a letter is attached.
- [ ] Viewing: Admins can always view. Leaders with jurisdiction can view while pending and get 403 once confirmed. Leaders without jurisdiction get 403. A URL expires after 5 minutes. HEIC downloads, the others open inline with the stored content type.
- [ ] Confirm keeps the letter. Reject clears it and leaves the file in place.
- [ ] Record resignation on a member with a pending letter keeps it, unless the Admin uploads one. Remove member clears it.
- [ ] Every other superseding exit path clears the letter.
- [ ] Reactivating a RESIGNED member clears the letter columns and leaves the object in place.
- [ ] DB checks reject a letter key on a REMOVED row, on an ACTIVE row without a resignation report, or without a content type.
- [ ] The lifecycle rules and the bucket-privacy check are documented in `DEPLOYMENT_GUIDE.md`.
- [ ] Role gating follows `skills/auth-check-patterns`: the server uses actual privilege, the UI uses acting privilege.
- [ ] Tests cover presign (auth, jurisdiction, declared type and size), submit checks (size, magic bytes, staging prefix), view access per role and state, and confirm / reject / carry-over / supersede / reactivation letter handling. R2 calls are mocked at the `s3Utils` boundary.

## Comments

- 2026-11-02: Grilled. Settled file types, viewing, retention, storage, required-ness, pop-up changes,
  carry-over visibility, late attach and serving safety (decisions 1–18). Status `ready-for-agent`.
- 2026-11-07: Built on branch `resignation-letter-upload`. Waiting on 21 (bucket privacy, lifecycle rules, CORS)
  before shipping; status `ready-for-human` for that and for review. Implementation notes:
  - **Where letters appear for a RESIGNED member.** There is no member drawer for members who have left the
    roster, so the Admin's "View letter" and "Attach / replace letter" sit on the newest resignation entry in
    Committee History (decision 16's "member drawer" part is covered there).
  - **Viewing privilege.** `GET /api/committee/resignation-letter` is Leader+, the same readers as the committee
    detail. A RequestAccess user can file a resignation with a letter but can't open it afterwards, as they
    can't see the Pending tab either.
  - **Token.** An HMAC (key derived from `AUTH_SECRET`) over staging key, user, membership, declared type and
    size, and an expiry of 1 hour (the presigned PUT itself expires after 5 minutes). Binding the membership
    means a staged file can't be reused on another member.
  - **Validation errors are 422**, the repo's `validateRequest` convention (a letter on a removal, keep + upload
    together, a declared type or size outside decision 3). Failed submit-time checks of the real file are 400.
  - **The other "superseding" paths:** flag confirm, replacement accept (handleRequest and meeting decisions),
    bulk sync removal, discrepancy undo (both branches) and petition loss all detach and move the letter after
    commit. Re-add, resubmit, discrepancy accept, bulk reactivation and a petition outcome on a RESIGNED row
    clear the columns and record `previousLetterKey`.
  - **Tests.** The PostgreSQL integration test gained the CHECK-constraint and helper cases, but wasn't run: the
    local Docker daemon was down at the end of the session. Run `pnpm --filter voter-file-tool test:pg` after
    `prisma migrate deploy` on the test DB.
- 2026-11-16: Simplified before manual testing, on review that the PR (about 4,000 lines) was more than the feature
  needed. Removed: moving cleared letters to a 90-day `rejected/` prefix (and the post-commit R2 moves and audit
  metadata on every exit path); the HMAC staging token (the staging key now carries the membership id); late
  attach (`RESIGNATION_LETTER_ATTACHED`, its route and UI); the carry-over checkbox and removal warning. Cleared
  letters now stay under the membership's prefix. Decisions 5, 10, 12, 14 and 15 are updated above. The
  `rejected/` lifecycle rule from 21 is now unused.

**2026-11-19, closed.** Shipped in PR #154 (merged 2026-11-19 06:37 UTC, deployed). The one remaining check, a Leader uploading a letter from the deployed app, is tracked on 23. No letter has been uploaded in prod yet (no resignation audit rows since the deploy). Follow-ups: 22, 24, 25.
