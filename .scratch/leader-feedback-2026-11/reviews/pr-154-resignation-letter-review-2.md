# PR #154 review 2: Let Leaders and Admins attach a resignation letter

- Branch `resignation-letter-upload`, HEAD `c76d368a` (verified in `/Users/matan/Documents/voter-file-tool-letter`)
- Base: merge-base `55b7ed90` with `origin/main` (fetched 2026-11-18). 56 files, +2926 / -24
- Spec: `.scratch/leader-feedback-2026-11/issues/08-resignation-letter-upload.md`
- Blind review: I didn't read earlier review files or the PR conversation.

## Verdict

**Approve, with minor follow-ups.** I found no blocking or high-severity problems. The server-side design holds up:

- The staging key is bound to its membership.
- The type and size checks run on the real object at submit.
- The copy is conditional on the ETag the checks saw.
- The staging copy is kept for a retry until the row write lands.
- Every exit write clears the letter by default.
- DB CHECKs back up the lifecycle.

The remaining risk is in R2 behavior that I couldn't run here: the signed Content-Length on a browser PUT, `CopySourceIfMatch` returning 412, and CORS. Ticket 23 also has to be done before shipping: bucket privacy, the staging lifecycle rule and CORS (decision 11).

## Checks run

| Check | Result |
| --- | --- |
| `git merge-tree --write-tree origin/main HEAD` | Clean, no conflicts. Main's 12 newer commits touch only record search and report-server PDF validation, so they don't overlap this PR. |
| `SKIP_ENV_VALIDATION=1 tsc --noEmit` (apps/frontend) | Pass, exit 0 |
| `SKIP_ENV_VALIDATION=1 jest` (apps/frontend, full suite) | 150 suites, 2184 tests, all passed |
| `jest --config jest.pg.config.cjs` against a temporary local DB (`pr154_review_*_test` in the local docker Postgres, after `prisma migrate deploy`; dropped afterwards) | 6 suites, 35 tests, all passed. This covers the new CHECK-constraint and letter-helper cases in `membershipExit.pg.integration.test.ts`. |

## Findings, ranked by severity

### Low

**L1. The catch path can delete a letter that the row already references, if the commit outcome is unknown.**
`apps/frontend/src/app/api/committee/exitReport/route.ts:252` and `apps/frontend/src/app/api/committee/remove/route.ts:237` call `discardPromotedLetter(promoted)` on any thrown error. That includes `prisma.$transaction` throwing after COMMIT reached the server, for example when the connection drops during commit. In that case the row keeps `resignationLetterKey`, but the object is gone, and the view endpoint returns a presigned URL that 404s. The staging copy still exists, but nothing points at it.

This is rare. Fixes, in order of preference:
- Only discard on the known-not-written branch (lines 233 / 226) and let orphans accumulate. Orphans are harmless, since cleared letters are kept anyway.
- Or re-read the row in the catch before deleting.

*Verified by reading the code; not reproduced.*

**L2. The ADR claims "No R2 call happens after a commit", which isn't true.**
`docs/adr/0002-exit-reports-on-the-membership-row.md:32` says this, but `releaseStagedLetter` deletes the staging copy after commit (`exitReport/route.ts:245`, `remove/route.ts:233`). The behavior is correct and deliberate: it's best-effort, it never throws, and the lifecycle rule backstops it. The ADR sentence should say "Nothing after the commit can fail the request; only the staging copy is deleted". The spec's "Shared exit helper" paragraph has the same wording. *Verified.*

**L3. The presign endpoint isn't jurisdiction-scoped for RequestAccess users.**
`apps/frontend/src/app/api/committee/resignation-letter/upload-url/route.ts:68-76` uses `leaderMayActOnCommittee`, which lets RequestAccess users act on any committee. Decision 9 says "RequestAccess+, with jurisdiction over the membership's committee". The route header documents the gap and it matches the existing `exitReport` / `requestAdd` policy, so this is a known, inherited gap.

Effect: any RequestAccess user can put files of up to 10 MB into any active membership's staging prefix. The lifecycle rule clears them after a day, and they can only reach a row through that user's own exit report, which is equally unscoped. I'm noting it for the record, not asking for a change in this PR. *Verified.*

**L4. Remove or Replace during the presign request doesn't cancel the PUT.**
In `apps/frontend/src/app/committees/workspace/adapters.ts:716`, the abort listener is attached inside `putWithProgress`. If the signal is aborted while `postJson(...upload-url)` (line 744) is still pending, `addEventListener` never fires and the XHR uploads anyway. `ResignationLetterField` ignores the result, so the state stays correct. The only cost is a wasted upload and an orphan staging object. Fix: check `signal?.aborted` before `xhr.send` and return early. *Verified by reading the code.*

**L5. The letter field has two tab stops.**
`apps/frontend/src/app/committees/workspace/drawer/ResignationLetterField.tsx:101-124`: the `sr-only` `<input type="file">` is still focusable, and the visible "Choose file" button sits next to it, so keyboard users tab through both. Add `tabIndex={-1}` to the input, or drop the proxy button and style the label. *Not checked in a browser.*

**L6. After a 400 that deleted the staging copy, the field still shows "Attached".**
When submit fails the size or magic-byte check, the server deletes the staging object (`resignationLetterStorage.ts:126,134,141`). The field stays `ready`, so resubmitting gives "didn't finish or has expired". The error text already says "Attach the file again", so this is a UX nit. A fix would be to reset the field to `error` when the submit failure is a letter error. *Verified by reading the code.*

### Info

- **I1. HEIC sniffing reads only the first 64 bytes.** (`apps/frontend/src/lib/resignationLetter.ts:83`) A file with a generic `mif1`/`msf1` major brand whose HEIC compatible brand comes after byte 64 would be refused. iPhone HEICs use the `heic` major brand, so this is unlikely to come up.
- **I2. The R2 client now disables checksums globally.** `requestChecksumCalculation/responseChecksumValidation: "WHEN_REQUIRED"` in `apps/frontend/src/lib/s3Utils.ts` also turns off default CRC32 for the existing report uploads and CSV presigns. That matches pre-3.729 SDK behavior and probably fixes CSV presigns too, but it's a global change and should be mentioned in the PR description.
- **I3. Viewing is Leader+, so a RequestAccess filer can't open the letter they attached.** Decision 4 says "anyone with jurisdiction". This deviation is documented in the 2026-11-07 spec comment and is consistent with who can see the Pending tab.
- **I4. "View letter" for RESIGNED members is on the newest resignation in Committee History, not in the member drawer.** This deviates from decision 16, but the 2026-11-07 comment documents it: there is no drawer for members who have left. The link is limited to actual Admins on the server (`membershipHistory.ts`, `isAdmin && status === RESIGNED`) and to acting Admins in the UI (`HistoryTab` passes `showAdminDetail` from `actingPermissions`). `resignationsSeen` is shared across batches, so only the newest resignation carries the link.

## Spec coverage (acceptance criteria)

| Criterion | Status |
| --- | --- |
| Leader can attach one PDF / JPEG / PNG / HEIC file of at most 10 MB, or submit without one | Met: `ReportExitForm` and `ResignationLetterField`; `exitReport` route promotes the letter |
| Removal reports have no field; the API rejects a letter on a removal | Met: the field renders only for `RESIGNATION`; `reportExitDataSchema` superRefine returns 422; `removeCommitteeDataSchema` is `.strict()`; `writeMembershipExit` / `fileExitReport` throw as a backstop |
| Real size or first bytes wrong: rejected and deleted | Met: `promoteStagedLetter` does HEAD and a ranged GET, deletes the object and returns 400; tested |
| Staging key for another membership, or expired, is refused | Met: prefix and UUID check (`resignationLetterStorage.ts:109`); a missing object returns 400. "Expired" in practice means the 1-day lifecycle rule (ticket 23), since the PUT URL itself lasts 5 minutes. |
| Instructions dialog shows whether a letter is attached | Met: `ExitInstructionsDialog` `letterFileName`; tested |
| View access: Admin always; Leader with jurisdiction while pending; 403 once confirmed; 403 without jurisdiction; 5-minute URLs; HEIC as attachment | Met: `letterViewAccess` (actual privilege via `hasPermissionFor`), `letterReadUrl`; access is checked before the existence check; tested |
| Confirm keeps the letter; reject clears it and leaves the file | Met: `letter: "keepReported"` in confirm; `clearRejectedExitReport` clears the columns; there is no R2 delete |
| Record resignation keeps the pending letter unless the Admin uploads one; removal clears it | Met: `remove/route.ts` `letter: promoted ?? "keepReported"`; tested in unit and pg tests |
| Every other superseding exit clears the letter | Met: the default in `letterUpdate` and in `writeMembershipLeavingActive`. I walked every caller: bulk sync, eligibility flag, replacement accept, both undo branches, petition loss. |
| Reactivation clears the columns and leaves the object | Met: add, requestAdd, discrepancy accept, bulk reactivation, petition outcome on RESIGNED. I grepped all `committeeMembership.update*` writers; the SUBMITTED to REJECTED/ACTIVE paths in `membershipConfirmation.ts` can't carry a letter under the CHECK. |
| DB checks | Met: two CHECKs in the migration; the pg tests cover REMOVED, ACTIVE without a report, a removal report, and missing type or name |
| DEPLOYMENT_GUIDE documents lifecycle, privacy and CORS | Met |
| Role gating per auth-check-patterns | Met: routes use `withPrivilege` and actual privilege; the UI uses `actingPermissions`; the letter key never leaves the server (`letterSummaryOf` drops it) |
| Test coverage | Met: presign (auth, jurisdiction, declared type, size, empty), submit checks, view per role and state, confirm / reject / carry-over / supersede / reactivation, all mocked at the `s3Utils` boundary |
| CONTEXT.md term and ADR entry | Met |
| AV-scan ticket; R2 setup ticket | Met: issues 22 and 23 |

**Scope creep:** none found. The global `jest.setup.ts` mocks for `@sentry/nextjs` and `~/lib/s3Utils` are a reasonable test-infrastructure change. They replace per-file Sentry mocks, and the suite still passes.

## Standards

- **auth-check-patterns:** followed (see the table). `isActualAdmin` uses `hasPermissionFor`, not ad hoc comparisons.
- **test-type-safety:** the new test code adds no `as any`, `as never`, `as unknown as` or `@ts-ignore`.
- **CONTEXT.md / ADR 0002:** updated. The ADR has one inaccurate sentence (L2).

## Security notes (verified by reading the code)

- **Presign:** the URL signs `content-type` and `content-length` (`signableHeaders`), lasts 5 minutes, and the key is server-generated (`staging/<membershipId>/<randomUUID>`).
- **Staging key validation:** an exact prefix for the membership looked up from the DB, plus a strict UUID regex. Traversal and cross-membership reuse aren't possible.
- **TOCTOU:** HEAD records the ETag, and the copy uses `CopySourceIfMatch` on that ETag. If the file was re-PUT between the checks and the copy, it gets 412, the staging copy is deleted, and the request returns 400. The ranged GET isn't ETag-pinned, but the conditional copy covers it.
- **Serving:** the stored type is the sniffed one. The presigned GET overrides `ResponseContentType` and `ResponseContentDisposition` (inline, or attachment for HEIC), and quotes, backslashes and CR/LF are stripped from the filename.
- **Key exposure:** keys never go to the client. The detail route selects the letter columns only to build history on the server.

## Not verified

- Against live R2:
  - whether a browser PUT to a presigned URL with a signed Content-Length is accepted;
  - whether `CopySourceIfMatch` and `MetadataDirective: REPLACE` behave as expected, with 412 on a mismatch;
  - CORS.

  Needs a manual test after ticket 23.
- The bucket having no public access (decision 11; dashboard only).
- UI behavior in a real browser: the upload progress line, the HEIC download, the new-tab redirect.
