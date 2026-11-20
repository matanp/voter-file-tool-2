# Review: PR #154, Resignation Letter upload

- PR: https://github.com/matanp/voter-file-tool-2/pull/154
- Branch: `resignation-letter-upload`, HEAD `0114e936`
- Merge base: `55b7ed90`
- Spec: `.scratch/leader-feedback-2026-11/issues/08-resignation-letter-upload.md`
- Reviewed: 2026-11-18

## Verdict

The PR is in good shape. I found no blocking bug, and the security-sensitive parts hold up.

What's verified:

- The branch merges cleanly into current `origin/main`.
- The 8 test suites the PR adds or touches pass (117 tests).
- **Presigned upload URL:** I generated one offline with the repo's S3 client settings. It signs `content-length;content-type;host` and expires in 300 seconds.
- **Staging key check:** it requires the membership's prefix with a trailing `/` plus an exact UUID. A similar membership id (`abc` / `abcd`) or `../` can't get through.
- **Writes that bypass the exit helper:** every direct `committeeMembership.update` outside the helper either touches only SUBMITTED rows or clears the letter columns. The new CHECK constraint won't throw on any existing path.

Two things are still unverified:

- A real browser upload against R2 (the last box in the test plan).
- The PostgreSQL test of the new CHECK constraints (`test:pg`). Commit `5356e77f` says it caught a bug, so it ran on 11-17. But ticket 08's 11-07 note says it was never run, so run it once more after `prisma migrate deploy`.

## Correctness (my own pass, outside the two review axes)

1. **Retrying after a failed submit always fails (worth fixing before merge).** `promoteStagedLetter` deletes the staging copy as soon as it copies the file (`resignationLetterStorage.ts`). If the write after it then fails, the route also deletes the copy through `discardPromotedLetter` (`exitReport/route.ts`, `remove/route.ts`). That happens on a 409 from a race or on a 500.
   - The form still shows "Attached: x.pdf", so a retry sends a staging key that no longer exists. The user gets "The letter upload didn't finish or has expired."
   - The same happens after a 400 from the letter checks: the staging file is deleted, but the field still looks attached.
   - **Fix:** reset the field to empty whenever a submit fails after promotion, or keep the staging copy until the row is written.
2. **Hardening (minor): the file can change between the checks and the copy.** Between the HEAD and the `CopyObject`, the client can still PUT different bytes of the same size and type through the 5-minute URL.
   - This adds little, because the check only reads the first 16 bytes anyway.
   - **Fix:** pass the ETag from the HEAD as `CopySourceIfMatch`.
3. **Existing gap the PR extends: the upload URL isn't jurisdiction-scoped for RequestAccess users.** `leaderMayActOnCommittee` (`exitReportAccess.ts:27`) returns `true` for any role other than Leader. So a RequestAccess user can get an upload URL for a member of any committee.
   - The exit report route already has this gap; this PR only adds file storage to it.
   - Ticket 08 decision 9 says the presign endpoint is "RequestAccess+, with jurisdiction over the membership's committee". Either tighten the check or update the ticket.

## Standards

Sources: `AGENTS.md`, `skills/auth-check-patterns/SKILL.md`, `skills/test-type-safety/SKILL.md`, `CONTEXT.md`, `docs/adr/`.

No hard violation of the auth skill:

- Both new routes use `withPrivilege`.
- Server-side decisions use `session.user.privilegeLevel`.
- The UI gates sit behind `showAdminDetail` and data the server already scoped.

### Documented-standard breaches

1. **Hard: query params skip Zod.** `api/committee/resignation-letter/route.ts` reads `membershipId` and `redirect` from `searchParams` by hand.
   - Rule: AGENTS.md says "request bodies and query params use Zod/shared validators".
   - The neighbouring `designationWeight/route.ts` and `memberSearch/route.ts` parse their params through a schema.
2. **Hard (test-type-safety skill): `selectedRow` with an inferred type.** `__tests__/api/committee/resignationLetter.test.ts` (around lines 105, 378, 419 and 449) and `membershipExit.letter.test.ts:41` call `selectedRow(r)` on `r: object`.
   - Rule: helpers that erase a shape need an explicit type argument, or a row typed with `satisfies`. The skill calls the inferred form "`as never` with extra steps".
3. **Soft: ad hoc admin check.** `isActualAdmin` (`api/lib/resignationLetterAccess.ts`) compares `=== Admin || === Developer` directly.
   - Rule: the auth-check-patterns skill says to use `hasPermissionFor(actual, required)`.
   - Similar comparisons already exist elsewhere in the codebase.
4. **Soft: repeated mock.** `jest.mock("@sentry/nextjs", …)` now appears in 4 test files.
   - Rule: the test skill moves a mock repeated 3 or more times into `mocks.ts`.
5. **Soft: inconsistent error body.** The GET route returns `{ error }`. `upload-url`, `exitReport` and `validateRequest`'s 422 return `{ success: false, error }`.

### Baseline smells (judgement calls)

- **Duplicated code**
  - `upload-url/route.ts` repeats the committee lookup, `leaderMayActOnCommittee`, the membership lookup and the ACTIVE / 409 checks from `exitReport/route.ts`.
  - The "Letter: name + `ViewLetterLink` + `letterViewHref`" block appears three times: twice in `PendingExitReportItem.tsx`, once in `CommitteeHistoryTimeline.tsx`.
  - "Wait for the letter to finish uploading." is written out in both `ExitReportForms.tsx` and `MemberExitForms.tsx`.
- **Duplicated literals**
  - "10 MB" is hard-coded in `resignationLetterStorage.ts`, `adapters.ts` (`letterFileProblem`), `validations/committee.ts` (`letterFileFields`) and `ResignationLetterField.tsx`, next to `LETTER_MAX_BYTES`.
  - "PDF, JPEG, PNG or HEIC" is written out in `resignationLetterStorage.ts` and `letterFileFields` instead of using `LETTER_TYPE_LABEL`.
- **Primitive obsession**
  - `letterViewAccess` types status and kind as `string` and compares the raw strings `"ACTIVE"` and `"RESIGNATION"`. The rest of the code uses `ACTIVE_MEMBERSHIP_STATUS` and the Prisma enums.
  - `HistoryMembershipRow.status?: string` has the same problem.
  - `letter?: "keepReported" | ResignationLetter` is a string sentinel, and it feeds a nested ternary in `writeMembershipExit`.
- **Speculative generality**
  - `letterUploadSchema` requires `fileName`, but `upload-url/route.ts` never reads it. The name actually travels with `stagedLetterSchema` at submit.
  - The `label` and `hint` props on `ResignationLetterField`, and `label` on `ViewLetterLink`, are never passed. The header comment says they're "meant for ticket 09".
  - `HistoryMembershipRow`'s four new fields are optional ("absent in older callers").
- **Data clumps:** the `MEMBER_RESIGNED` case in `membershipHistory.ts` rebuilds the three letter columns with `?? null` just to pass them to `letterOnRow`. Typing the row as `LetterColumns` would remove that.
- **Shotgun surgery:** the new columns forced `...CLEARED_LETTER_FIELDS` into five hand-maintained reset blocks: add, requestAdd, handleCommitteeDiscrepancy, petition-outcomes/record and bulkLoadUtils. The reset blocks predate this PR. One shared "reactivation reset" constant would gather them.
- **Divergent change:** `lib/resignationLetter.ts` mixes four concerns: file rules, R2 key layout, row-column mapping and API (Zod) schemas. Half of the API schemas live in `lib/validations/committee.ts`.
- **Dead branch:** `uploadResignationLetter` (`adapters.ts`) calls `declaredLetterType` twice, and its `problem ?? "Unsupported file"` fallback can never run.
- **Mysterious name:** the local `error()` helper in `upload-url/route.ts` shadows a common word and differs from neighbouring routes, which build `NextResponse.json` directly.

## Spec (ticket 08)

Almost every decision and acceptance criterion is met. These match the spec:

- the staging prefix check;
- the HEAD, ranged GET, delete and 400 sequence, then copy and delete;
- the CHECK SQL;
- the `letter` option on `writeMembershipExit`, and every caller of it and of `writeMembershipLeavingActive`;
- all reactivation writes: add, requestAdd, discrepancy accept, bulk `activateMember` and petition outcome;
- the view access rules;
- `ResponseContentType` and `ResponseContentDisposition`;
- where "View letter" appears;
- the dialog's letter line;
- the letter key in the audit metadata;
- `CONTEXT.md`, ADR 0002 and `DEPLOYMENT_GUIDE.md`.

### (a) Missing or partial

1. **Jurisdiction on the upload URL.** Decision 9 says "RequestAccess+, **with jurisdiction**". See correctness item 3.
2. **Reactivation tests.** The spec says "Tests cover … reactivation letter handling". Only re-add tests the clearing (`add.test.ts`). Resubmit (requestAdd), discrepancy accept, bulk reactivation and petition outcome have no such test.
3. **Supersede tests.** The spec says "Tests cover … supersede". Only the helper unit test and the pg integration case for removal cover it. No route-level test covers flag confirm, replacement accept, bulk sync or undo. That's arguably enough, since clearing is the helper's default.
4. **"Expired" staging keys.** The spec says "A staging key issued for another membership (or expired) is refused." Without the HMAC token, a key is refused only once its object is gone (HEAD 404). That depends on the 1-day lifecycle rule, so in practice a staged file stays usable for about a day.
5. **pg integration test.** See the Verdict section.

### (b) Not asked for (scope creep)

1. **Global S3 client change.** `requestChecksumCalculation` / `responseChecksumValidation: "WHEN_REQUIRED"` (`s3Utils.ts`) applies to every R2 call, including report PDFs and CSV uploads. It's probably fine, but check one report upload after deploy.
2. **`redirect=1` on the view endpoint.** The spec says the endpoint "returns `{ url }`". The redirect is a reasonable way to make a plain link work.
3. **CORS steps** in `DEPLOYMENT_GUIDE.md` and ticket 21. They aren't in the spec's infrastructure list, but they're needed.
4. **Stricter CHECK.** The fields-together CHECK also requires the file name, where the spec says only "key and content type are set together". That's fine.

### (c) Implemented but looks wrong or weak

1. **HEIC detection is too broad.** The brand list (`HEIC_BRANDS` in `lib/resignationLetter.ts`) includes the generic `mif1` / `msf1` brands, so AVIF and other HEIF files pass as `image/heic`. The harm is low because HEIC is served as a download.
2. **Not-found before forbidden.** The view route returns 404 ("No letter is attached") before checking access. A Leader outside the jurisdiction can tell whether a letter exists, where the spec says "Leaders without jurisdiction get 403". The risk is low because membership ids are cuids.
3. **No "View letter" in the member drawer.** Decision 16 asks for it "in the member drawer and Committee History entry for a RESIGNED membership". It appears only in Committee History, on the newest resignation event. The 11-07 note explains why (there is no drawer for members who have left), so this needs the spec owner's sign-off.

### Bookkeeping

- **Ticket 08 isn't committed.** It's untracked in the main checkout and not on the branch, so its 11-07 and 11-16 notes don't ship with the code. Ticket 01 is untracked too.
- **Ticket number clash.** The branch's new `21-r2-letter-lifecycle-and-privacy.md` uses the same number as the untracked `21-strict-election-district-parsing.md` in the main checkout.

## Summary

| Axis | Findings | Worst |
|---|---|---|
| Correctness | 3 | A retry after a failed submit always fails, because the staging copy is already deleted |
| Standards | 5 breaches, plus smells | Query params skip Zod on the view route |
| Spec | 12, plus bookkeeping | The upload URL doesn't check jurisdiction for RequestAccess users |
