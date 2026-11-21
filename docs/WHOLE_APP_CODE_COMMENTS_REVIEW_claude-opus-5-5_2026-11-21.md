# Whole-App Code Comments Review

## Basis
- **Branch:** `main` · **Commit:** `1032ac09` · **Date:** 2026-11-21 · **Model:** `claude-opus-5-5`
- **Deliverable:** `docs/WHOLE_APP_CODE_COMMENTS_REVIEW_claude-opus-5-5_2026-11-21.md`
- **Review run:** `.review/runs/comments-2026-11-21` (gitignored; rubric, mechanical baseline, lane and verifier notes)
- **Files measured:** 807 tracked source files (581 product, 226 test) · 132,124 code lines · 9,317 comment lines
- **Axis:** comment density, consistency, accuracy and value
- **Method:** mechanical density baseline over every file → 8 Sonnet discovery lanes (A API routes, B committees UI, C admin and other pages, D frontend lib/components/Prisma schema, E report-server, F packages, G scripts and infrastructure, H tests) → 3 Opus verifiers (A; B/C/D; E/F/G/H), whose verdicts override lane claims → Opus synthesis → Fable final review.
- **Coverage was sampled, not exhaustive.** Read in full: lane F (every non-test source file in `packages/shared-prisma`, `packages/shared-validators` and `packages/voter-import-processor`) and lane G (all of the infrastructure scripts and configs and nearly all of `scripts/`). Read in part: lane A (about 35 route and lib files in full, about 18 in part, the rest by comment-line grep), lane D (about 17 files in full, the rest skimmed, components/ui counted only), lane B (the workspace core in full; the legacy selector and prototype bodies not opened), lane C (3 files in full, the rest by comment grep plus targeted reads) and lane E (6 files in full, the rest skimmed). Lane H swept all 226 test files by pattern and read about 20 of them around their comments. The final review re-read every High finding and escalation against the code at this commit, recomputed the density, era and reference counts, and added the 100-line random sample behind the "earn their keep" figure.

## Direct answers

**What is the density?** Overall it is 0.071 comment lines per code line. Product code runs at 0.102 (7,348 / 72,332) and tests at 0.033 (1,969 / 59,792). Leaving out the shadcn components/ui boilerplate barely moves the product figure (0.105). The spread between areas is wide:

| Area | Files | Code | Comment | Ratio |
|---|---|---|---|---|
| shared-validators src | 23 | 1,868 | 460 | 0.246 |
| infrastructure | 10 | 755 | 166 | 0.220 |
| frontend lib/validations | 5 | 1,223 | 255 | 0.209 |
| report-server src | 38 | 5,802 | 870 | 0.150 |
| shared-prisma src | 5 | 828 | 113 | 0.136 |
| report-server pdf-validation | 33 | 4,571 | 488 | 0.107 |
| frontend app/committees | 70 | 12,140 | 1,198 | 0.099 |
| frontend app/api | 97 | 14,372 | 1,397 | 0.097 |
| scripts | 19 | 2,614 | 186 | 0.071 |
| frontend app/admin | 50 | 7,560 | 222 | 0.029 |
| frontend components/reports | 10 | 1,932 | 33 | 0.017 |
| frontend app/auth | 3 | 465 | 0 | 0.000 |
| frontend tests | 175 | 51,403 | 1,864 | 0.036 |
| report-server tests | 25 | 4,206 | 76 | 0.018 |
| shared-validators tests | 22 | 3,520 | 7 | 0.002 |

**Is it consistent?** No. Density is bimodal and tracks when a module was written more than how complex it is. Of the 157 product files with at least 150 code lines, 36 (23%) are under 2% comments and 34 (22%) are at or above 15%. Grouping the 221 non-ui product files of at least 100 lines by the date git first saw them:

| Created | Files | Under 2% comments | Ratio |
|---|---|---|---|
| September 2026 on | 67 | 2 | 0.113 |
| January–August 2026 | 79 | 29 | 0.061 |
| Before 2026 | 75 | 12 | 0.095 |

Creation date is a proxy: some older files were later rewritten, and much of the oldest group's volume is template JSDoc and commented-out code. The sharpest contrasts sit side by side in the same flows. `apps/frontend/src/lib/applyPendingInvite.ts` has 0 comment lines in 363, while `apps/frontend/src/lib/resignationLetter.ts` has 59 in 151. `apps/frontend/src/app/api/committee/handleRequest/route.ts` has 0 in 200, while `apps/frontend/src/app/api/lib/membershipExit.ts` has 86 in 262. `apps/report-server/src/jobOrchestration.ts` has 0 in 174, next to the fully documented `apps/report-server/src/petitionFit.ts`. Form is just as mixed: at least six ticket-reference shapes, three file-header conventions, and `eslint-disable` with and without reasons.

**Do comments earn their keep?** About two-thirds of them do. In a seeded random sample of 100 product comment lines, each judged by the comment it belongs to, 66 said something the code cannot (a rule, invariant, authorization policy, external quirk or measured reason), 30 restated the code or were bare section banners, 2 were ownerless TODOs, 1 was commented-out code and 1 was stale. With a sample of 100 the informative share is roughly 56–75%; one reviewer classified it, with two borderline calls counted as restating. The informative lines cluster in the committees workspace, the API lib helpers, the validation schemas and the PDF-validation harness. The restating lines cluster in the search stack, the report-server report processors and the older shared-validators utilities.

Pattern counts give floors for the rest, and they undercount: about 420 lines (≈6%) match step-narration or signature-restating patterns (221 short imperative `// Verb …` lines, 169 `@param`/`@returns` lines, 32 one-line restating JSDoc blocks), about 260 (≈3.5%) carry a ticket, plan, SRS, decision or PR reference, and at least 130 (≈2%) are commented-out code. Verifiers confirmed about 35 distinct stale comments (Findings 3, 7, 8, 10 and 11). That is under 1% of lines, but stale comments cost the most per line because readers trust them. High density is no proof of value: `apps/frontend/src/lib/useSearchState.ts` (0.31) is mostly name-restating JSDoc, and `apps/frontend/src/app/recordsearch/fieldsConfig.tsx` (0.23) is mostly commented-out code.

**Are there missing comments?** Yes, concentrated where an edit is most likely to cause damage: sign-in privilege sync and invite consumption (Finding 1), interactive-transaction and lock-order rules (Finding 2), the voter-import file and SQL contracts (Finding 4), security-relevant API edges (Finding 9), and the provisioning and dev-database scripts (Findings 10–11). Twelve items the lanes filed as comment gaps turned out to be code defects; they are listed separately under [Escalations](#escalations--code-defects-found-incidentally).

## At a glance

| # | Finding | Severity | Blast | Opportunity |
|---|---------|----------|-------|-------------|
| 1 | Sign-in privilege sync and invite consumption are uncommented | High | medium | State auth rules where they execute |
| 2 | Transaction and lock rules documented once, absent where relied on | High | medium | Carry the aborted-tx rule to every catch |
| 3 | Comments overstate idempotency, immutability and signing | High | medium | Make safety claims match the code |
| 4 | Voter-import column order and raw-SQL safety unstated | Medium | medium | Name the positional and SQL contracts |
| 5 | Ticket numbers stand in for the reason, in six formats | Medium | large | Inline the rule; one reference format |
| 6 | Step narration and template JSDoc in the older modules | Medium | large | Delete restating comments |
| 7 | Stale comments in ordinary logic | Medium | large | Fix each confirmed mismatch |
| 8 | Pointers to deleted or renamed files | Medium | medium | Repoint or drop dead references |
| 9 | Security-relevant API-edge constraints stated nowhere | Medium | medium | One-line why at each edge |
| 10 | Dev-tooling comments vouch for scripts that do otherwise | Medium | medium | Align tooling comments with behaviour |
| 11 | Provisioning: surprising choices bare, narration plentiful | Medium | small | Comment the decisions, cut the narration |
| 12 | Report-server operational constants lack their reasons | Low | small | Move ticket rationale beside the constant |
| 13 | Commented-out code and ownerless TODOs | Low | medium | Delete; ticket or drop TODOs |
| 14 | Test-comment contract from the type-safety skill unmet | Low | medium | Reasons on suppressions and casts |

**Counts:** 14 findings · 4 backlog-only notes · 12 escalations

## Subsystem map

| Area | Defining surfaces | Comment profile |
|---|---|---|
| API routes and route libs | committee, admin, auth/invite, report routes; API lib helpers | lib helpers dense and earned; older routes narrate; auth and transaction routes bare |
| Committees UI | workspace grid, drawer, tabs, adapters; legacy selector; prototype | workspace strong; ticket archaeology; legacy thin |
| Admin and other pages | admin tables and dialogs, invite page, record search, report forms | newer logic modules good; CRUD forms narrate; invite page bare |
| Frontend lib and schema | search stack, validations, auth, invites, Prisma schema | bimodal: prose rule-docs vs template JSDoc or nothing |
| Report-server | job queue, PDF/XLSX rendering, PDF validation harness | best in repo on Chrome and memory; plumbing thin |
| Packages | shared-validators, shared-prisma, voter-import-processor | few excellent contract files; rest restating or bare |
| Scripts and infrastructure | deploy, dev launcher, dev-DB setup, Terraform, provisioning | hardened scripts exemplary; older provisioning and Terraform weak |
| Tests | frontend, report-server, packages | newer suites state what they pin; older suites use AAA markers |

## Findings

### 1. Sign-in privilege sync and invite consumption carry the least explanation in the app
**Severity: High · Blast radius: medium**
**What & where.** `apps/frontend/src/auth.ts` · `apps/frontend/src/lib/applyPendingInvite.ts` · `apps/frontend/src/app/api/auth/invite/[token]/apply/route.ts` · `apps/frontend/src/app/auth/invite/[token]/page.tsx` · `apps/frontend/src/app/page.tsx`
**Why it hurts.** The rules that decide who holds which privilege are written nowhere near the code that applies them, and a plausible edit to any of them breaks auth.
- `auth.ts` overwrites `User.privilegeLevel` from `PrivilegedUser` at every sign-in, around lines 56–86, and demotes the user to ReadAccess when no row exists. The only comment is "sync privilege level from PrivilegedUser table". Nothing says this table is the live source of truth, or that the app itself only ever writes it when an invite is applied, so lowering or removing a row is a manual database edit that takes effect at the user's next sign-in. A proposal in docs/SCHEMA_IMPROVEMENTS.md §2.4 assumes the opposite. The catch then swallows errors and returns `true` with no stated reason (see Escalation E7).
- `applyPendingInvite.ts` has 0 comment lines in 363. It does not explain:
  - the `updateMany` plus `count === 0` compare-and-set that makes consuming an invite race-safe (around lines 253–273);
  - why a `legDistrict === null` scope uses `findFirst` instead of the compound `findUnique`, which comes from Prisma's compound-unique input and the partial index;
  - the asymmetry for a Leader invite with no jurisdictions in `checkAlreadyApplied`, around lines 203–210;
  - the audit role that falls back to Admin when the inviter row is missing, around line 379.
- The apply route is wrapped in `"Authenticated"`, and its real protection is two gates: email equality with the invite, and the invite-id match inside `applyPendingInvite`. Neither is named. Skipping the active-term check for an already-used invite, around line 85, is what keeps a replay idempotent after a term rollover, and that is also unstated.
- On the client, the `?skipInviteClaim=1` parameter is a loop-breaker between the home-page redirect and the invite page, and neither side says so. The apply-once ref is reset only on sign-out, so a failed apply does not retry until the user signs out. That is not stated either.
**Opportunity.** State each of these rules in a line or two at the point where it executes, following `skills/auth-check-patterns/SKILL.md`.
**Evidence.** verify-BCD D1–D6, C1, C3; verify-A #9, #10; per-file counts (`applyPendingInvite.ts` 363/0, app/auth 465/0); re-read `auth.ts` lines 56–89 at HEAD.

### 2. Interactive-transaction and lock-order rules are documented once and absent where they are relied on
**Severity: High · Blast radius: medium**
**What & where.** `apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts` · `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts` · `apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/undo/route.ts` · `apps/frontend/src/app/api/lib/membershipConfirmation.ts` · `apps/frontend/src/app/api/committee/handleRequest/route.ts` · `apps/frontend/src/app/api/admin/governance-config/route.ts`
**Why it hurts.** The repo's sharpest correctness edge is Postgres's aborted-transaction state, and its rule is written down in one place only. `bulkLoadUtils.ts` around line 269 says that catching "P2002 and continuing would leave PostgreSQL in an aborted-transaction state". The decisions route does exactly that inside `prisma.$transaction` with no comment (Escalation E8). Other gaps:
- The undo route takes four row locks in a fixed order (CommitteeList, discrepancy, membership, voter) and never says that the order matters.
- `confirmSubmittedMembership` returns `atCapacity` after it has already committed the membership as REJECTED. Its two callers report "at capacity" without saying the row was rejected (Escalation E12).
- `governance-config` uses `{ timeout: 30_000, maxWait: 10_000 }` with no reason, although its sibling `apps/frontend/src/app/api/admin/crosswalk/import/route.ts` explains the same 30-second timeout.
**Opportunity.** Wherever code catches inside a transaction or depends on lock order, state the rule there or point to the one place that states it.
**Evidence.** verify-A #12 (ESCALATE), #13 (corrected: only the atCapacity path writes and then returns failure), #16, #17, #37; re-read the decisions route lines 88 and 141–176 at HEAD.

### 3. Comments overstate idempotency, immutability, signing and route purpose
**Severity: High · Blast radius: medium**
**What & where.** `apps/frontend/src/app/api/reportComplete/route.ts` · `apps/frontend/src/app/api/committee/add/route.ts` · `apps/frontend/src/lib/auditLogGuard.ts` · `apps/frontend/src/app/api/generateReport/route.ts` · `apps/frontend/src/app/api/admin/loadAdmin/route.ts`
**Why it hurts.** Each of these comments promises a data-integrity or security property that the code does not deliver, so a reader who trusts it will not add the guard that is missing.
- `reportComplete` says its status check "prevents regressing terminal statuses and makes the endpoint idempotent". It is a plain read followed by unconditional updates, so two concurrent callbacks can both pass.
- The committee add route says it is "idempotent — any non-terminal status". It returns idempotently only for ACTIVE rows, and other rows are reactivated.
- `auditLogGuard.ts` "enforces AuditLog immutability at runtime". That holds only on the one client the middleware is attached to. The report-server client, the seed, raw SQL and the database itself are not covered.
- `generateReport` says "Create HMAC signature for the gzipped payload", which implies a protected channel. The MAC covers a latin1 string re-encoded as UTF-8, and the worker never verifies it (Escalation E3).
- `loadAdmin`'s JSDoc says it "returns admin payload". The handler promotes two hard-coded accounts to Developer on `User` only, writes no audit row, and returns `{ success: true }`. The sign-in sync in Finding 1 then overwrites that level from `PrivilegedUser` at the account's next sign-in, which is also unstated.
**Opportunity.** Reword each claim to what the code guarantees today, or make the code meet the claim.
**Evidence.** verify-A #2, #3, #6, #8, #22; verify-BCD D10; re-read the quoted lines at HEAD (reportComplete around line 78, add around line 181, loadAdmin around line 14, generateReport around line 154).

### 4. Voter-import column order and raw-SQL safety rest on unstated contracts
**Severity: Medium · Blast radius: medium**
**What & where.** `apps/frontend/src/app/api/lib/utils.ts` · `apps/frontend/src/app/api/admin/bulkLoadData/bulkLoadUtils.ts` · `packages/voter-import-processor/src/parseVoterFile.ts` · `packages/voter-import-processor/src/voterRecordProcessor.ts` · `packages/shared-prisma/src/boeEligibilityFlagging.ts`
**Why it hurts.** The voter file has no header row, and `Object.keys(exampleVoterRecord)` supplies its positional headers. The key order of an object named as an example is therefore the column mapping, and the same keys are the column allow-list. There are two copies, one in the API lib utils and one in `voterRecordProcessor.ts`, each feeding its own parser. The frontend copy has no comment, the package copy has a one-line hint ("Example voter record structure for CSV headers"), and no test pins the order. In the package path, inserting a key ahead of the three date columns fails loudly on the first row's date parse, which is why this is not High; reordering text columns, or adding a key after the dates, shifts data silently. Further gaps:
- `voterRecordProcessor.ts` builds SQL for `$executeRawUnsafe`. It is safe only because the column names come from a constant list and because Postgres has `standard_conforming_strings` on. Neither is written down.
- An update skips an older file and silently resets `hasDiscrepancy`, also without comment.
- The exported `runBoeEligibilityFlagging` and `isVoterPossiblyInactive` have no contract docs, although the internal helpers around them have some.
**Opportunity.** State the positional-header contract and the SQL-safety assumptions at the definitions.
**Evidence.** verify-A #15 (line corrected); verify-EFGH F7, F8, F11–F13 and its "not escalated" analysis of the raw SQL (not injectable today); final review traced every use of `exampleVoterRecord` and the row-error path in `parseVoterFile.ts` at HEAD.

### 5. Ticket numbers stand in for the reason, in six formats, and many point into `.scratch/`
**Severity: Medium · Blast radius: large**
**What & where.** Representative: `apps/frontend/src/app/committees/workspace/tabs/registry.ts` · `apps/frontend/src/app/committees/workspace/drawer/MemberExitForms.tsx` · `apps/frontend/src/lib/resignationLetter.ts` · `apps/frontend/src/app/api/lib/membershipHistory.ts` · `apps/frontend/prisma/schema.prisma` · `apps/report-server/pdf-validation/src/scenarios.ts` · `apps/frontend/.eslintrc.cjs`
**Why it hurts.** About 260 product comment lines carry a reference, in these forms:
- `ticket NN`: 68 lines in 49 files;
- `plan §N`: 42 lines in 30 files;
- `SRS N.N` or `SRS §N`: about 140 lines;
- `decision N`: 10 lines;
- `(1.R.7)`, `(2.8)` and similar;
- `.scratch/` paths: 9 lines, one of them elided with "…".

A bare "ticket 08" means three different tickets in different series. Some comments narrate the plan instead of stating the lasting rule: "Tickets 09–12 replace the component files", "moved out of … until cutover", "old detail", "today's /committees". "PR #148" is cited in code, in the README and in a test assertion while that PR is still open. The SRS references resolve to tracked docs, but the ticket and decision references resolve only into `.scratch/`, and an open dev-environment issue (06) proposes untracking it. That would leave every one of them pointing at nothing.
**Opportunity.** Inline the rule the reference stands for and keep at most one reference format that resolves in the repo.
**Evidence.** Grep counts over product files at HEAD; verify-A #7, #26; verify-BCD B5–B9, B14, D21, D22; verify-EFGH E12–E14, G14, H12.

### 6. Step narration and template JSDoc fill the older modules
**Severity: Medium · Blast radius: large**
**What & where.** `apps/frontend/src/lib/useSearchState.ts` · `apps/frontend/src/lib/searchFieldTypeGuards.ts` · `apps/frontend/src/app/api/getCsvUploadUrl/route.ts` · `apps/frontend/src/app/api/getVoterFileUploadUrl/route.ts` · `apps/frontend/src/app/api/reportJobs/route.ts` · `apps/report-server/src/index.ts` · `apps/report-server/src/webhookUtils.ts` · `scripts/setup-dev-db.sh`
**Why it hurts.** Narration crowds out the comments that matter and teaches readers to skim. `useSearchState.ts` has 18 JSDoc blocks that mostly restate function names. `searchFieldTypeGuards.ts` has 10 "Type guard for …" lines out of 10. Each upload-URL route has six `// Validate …` step comments. "API mutation hook" appears 11 times in admin pages, and 16 of the 17 comments in `setup-dev-db.sh` narrate steps. The 169 `@param`/`@returns` lines in product code mostly repeat the TypeScript signature. In tests, 102 lines are `// Arrange` / `// Act` / `// Assert` markers, 69 of them in the fetchCommitteeList route test. In `searchFieldProcessor.ts` this noise hides two genuinely stale comments (Finding 7).
**Opportunity.** Delete comments that restate the code so the remaining ones carry weight.
**Evidence.** verify-A #24, #25; verify-BCD C12, D23, D24; verify-EFGH E15, E17, G15, H7; mechanical pattern counts over product files.

### 7. Stale comments in ordinary logic
**Severity: Medium · Blast radius: large**
**What & where.** `apps/frontend/src/app/api/lib/seatReconciliation.ts` · `apps/frontend/src/lib/searchFieldProcessor.ts` · `apps/frontend/src/lib/dateUtils.ts` · `apps/frontend/src/lib/validations/committee.ts` · `apps/frontend/src/app/committee-reports/hooks/useFormValidation.ts` · `packages/shared-validators/src/fileUtils.ts` · `packages/shared-validators/src/schemas/report.ts` · `packages/shared-validators/src/searchQueryUtils.ts` · `apps/report-server/src/utils.ts` · `apps/frontend/src/app/api/lib/committeeRead.ts` · `apps/frontend/src/app/api/reportComplete/route.ts` · `apps/frontend/src/app/committees/_prototype/CommitteesPrototype.tsx` · `apps/frontend/src/app/committees/CommitteeSelector.tsx` · `packages/shared-prisma/src/index.ts`
**Why it hurts.** Each of these comments says something the code contradicts:
- `findDecreaseBlockers` "returns true" but returns details or null, around line 100.
- In `searchFieldProcessor.ts`, a JSDoc describing a union-returning function sits on a string-returning one around line 516, and the "unchecked maps to undefined earlier" claim around line 614 is false for `false`.
- `dateUtils.ts` claims noon UTC avoids DST and that the value is normalised to midnight. UTC has no DST and nothing normalises.
- `meetingIsoDateString` is said to be "reused" when only the pattern is.
- "Need at least name and address" sits above `name || address`.
- "First 8 characters of UUID hash" sits above `id.slice(-8)`.
- In `report.ts`, the "order matters" refine can never fire.
- "OR condition" sits above `{ in }`.
- "Path to your built Tailwind CSS" sits above a URL.
- `fetchCommitteeList` is called "retired" while it is still live.
- `reportComplete` carries a Netlify hint in a Vercel app.
- The prototype says it will be "deleted from main once decided", but its ticket is resolved and the 3,304 lines remain.
- An LD-sentinel remark in `CommitteeSelector.tsx` contradicts its own guards.
- In the shared-prisma index, "Re-export all" lists 19 of 27 models.

The frontend Jest setup file (jest.setup.ts at the frontend root) belongs here too. It calls its enum and model stubs "pre-migration" and "removable" and refers to a jest.config.js that does not exist. `apps/frontend/src/lib/validations/committee.ts` line 2 still says its types "resolve after running prisma migrate dev". Escalation E6 shows these stubs are load-bearing and have drifted.
**Opportunity.** Correct or delete each confirmed mismatch.
**Evidence.** verify-A #1, #4, #5; verify-BCD B2, B3, C10, D13, D14, D16–D19, D26; verify-EFGH E16, F2–F6, H1–H3. No STALE claim from any lane was rejected.

### 8. Pointers to deleted or renamed files
**Severity: Medium · Blast radius: medium**
**What & where.** `apps/frontend/src/app/committees/CommitteeRosterTable.tsx` · `apps/frontend/src/app/api/committee/roster/route.ts` · `apps/frontend/src/app/api/committee/roster/buildSeatRosterRows.ts` · `apps/frontend/src/lib/validations/committee.ts` · `apps/frontend/src/lib/eligibility.ts` · `apps/frontend/src/components/providers/PostHog.tsx` · `scripts/generate-committee-diff-report.ts`
**Why it hurts.** A reader who follows these references finds nothing:
- Five comments cite docs/COMMITTEE_ROSTER_VIEW.md, which was deleted in `4bd76b46`. The fifth is in the committee roster route test. Most of them already cite the replacement (the workspace UI plan §5) on the same line.
- `eligibility.ts` names an SRS file without its directory.
- `membershipHistory.ts` cites a `.scratch` path elided with "…".
- The PostHog providers carry vendor-docs path banners with the wrong file names and extensions.
- The committee-diff script says it uses "the same parsing rules as bulkLoadUtils.ts", but those rules now live in the roster-format module.
- The fetchCommitteeList test points to a "jest.setup.js".
**Opportunity.** Repoint each reference to the current file or drop it.
**Evidence.** verify-BCD B1 (5 sites; `git log --all` shows the deletion), D15, D20, D25; verify-A #7; verify-EFGH G9, H8.

### 9. Security-relevant constraints at API edges are stated nowhere
**Severity: Medium · Blast radius: medium**
**What & where.** `apps/frontend/src/app/api/getCsvUploadUrl/route.ts` · `apps/frontend/src/lib/s3Utils.ts` · `apps/frontend/src/app/api/lib/resignationLetterStorage.ts` · `apps/frontend/src/app/api/generateRealtimeToken/route.ts` · `apps/frontend/src/app/api/admin/scripts/specialVoterFile/route.ts` · `apps/frontend/src/app/api/committee/add/route.ts` · `apps/frontend/src/app/api/auth/invite/[token]/route.ts` · `apps/frontend/src/app/components/ReportStatusTracker.tsx`
**Why it hurts.** Each of these is a constraint that a reasonable edit could break without anyone noticing:
- The CSV upload size check is advisory: the presigned URL does not sign `content-length`, and the sized variant is used only for resignation letters.
- The `["\\\r\n]` strip on resignation-letter file names is a header-injection guard, but its only comment is about the 5-minute expiry.
- The Ably token request sets no `capability`, so the effective rights are whatever the dashboard key grants.
- `specialVoterFile` does nothing in production and still reports "Data loaded successfully".
- `isAdmin = userRole === Admin` deliberately leaves Developers out of `forceAdd` in three routes.
- The public invite GET reveals `existingAccount` to the token holder.
- The report-status channel name is a string literal that must match the publisher in `reportComplete`.
**Opportunity.** Add a one-line why at each edge, so that changing it is a deliberate act.
**Evidence.** verify-A #11, #14 (the capability fact confirmed; impact depends on key configuration outside the repo), #19, #20, #21, #23; verify-BCD C9.

### 10. Dev-tooling comments and docs vouch for scripts that do something else
**Severity: Medium · Blast radius: medium**
**What & where.** `scripts/README.md` · `scripts/sync-prisma-models.js` · `scripts/setup-dev-db.sh` · `scripts/run-tests.ts` · `scripts/review/run-scans.sh`
**Why it hurts.** The scripts README recommends `sync-prisma` as "Sync Prisma models to shared-prisma", but running it overwrites the hand-maintained shared-prisma index (Escalation E1). `setup-dev-db.sh` ends with "Shared packages rebuilt", although only shared-prisma is built, as a side effect of migrating. Nothing in it warns that it migrates whatever database URL `.env` points at (E2). `run-tests.ts` describes itself as running "all workspace packages with tests" while leaving out shared-prisma (E5). The "Valid:" usage list in `run-scans.sh` omits `design-ui`. These are the comments a developer reads right before running something destructive.
**Opportunity.** Make each tooling comment describe what the script actually does and touches.
**Evidence.** verify-EFGH ESCALATE 1, 2 and 5; G1, G2, G3.

### 11. Provisioning code leaves its surprising choices bare and narrates the obvious ones
**Severity: Medium · Blast radius: small**
**What & where.** `main.tf` · `infrastructure/scripts/01-install-dependencies.sh` · `infrastructure/scripts/04-setup-env.sh` · `infrastructure/scripts/06-setup-pm2.sh` · `infrastructure/scripts/07-start-services.sh`
**Why it hurts.** `main.tf` has no comment on its most surprising decisions: port 8080 open to the world, a token in the clone URL, or a `user_data` block that carries secrets and whose edit replaces the instance through `replace_triggered_by`. Its one descriptive comment, "Smallest instance size", sits on `micro_3_0`, which is not the smallest. The older provisioning scripts are full of narration such as "Fix ownership if needed" and "Step 3:". Their few factual comments are wrong:
- "NodeSource via nvm" refers to an install that never happens.
- `04-setup-env.sh`'s header describes work its body says is done elsewhere.
- In the user_data path, `06-setup-pm2.sh` only echoes the `pm2 startup` command and never runs it.
- "Start nginx" sits above `systemctl enable`.
**Opportunity.** Comment the decisions an operator would question, and cut the narration.
**Evidence.** verify-EFGH G4–G8, G18–G20 (8080 and the token are also Escalations E3 and E4).

### 12. Report-server operational constants lack their reasons
**Severity: Low · Blast radius: small**
**What & where.** `apps/report-server/src/utils.ts` · `apps/report-server/src/index.ts` · `apps/report-server/src/jobOrchestration.ts` · `apps/report-server/src/xlsxGenerator.ts`
**Why it hurts.** The Chrome launch arguments carry no comment, although `apps/report-server/pdf-validation/src/scenarios.ts` warns that `--single-process` can hang `close()`. The reason for `QUEUE_CONCURRENCY = 2`, around line 71, lives only in a ticket. BOE eligibility jobs skip the failure callback without saying so. `jobOrchestration.ts` (0 comments) does not state its schedule: on by default, a 10-minute initial delay, interval runs that may overlap, and the BOE follow-up. This sits in the subsystem with the best comments in the repo, so the gaps stand out.
**Opportunity.** Put each constant's rationale next to the constant.
**Evidence.** verify-EFGH E5–E9.

### 13. Commented-out code and ownerless TODOs
**Severity: Low · Blast radius: medium**
**What & where.** `apps/frontend/src/app/recordsearch/fieldsConfig.tsx` · `apps/frontend/src/lib/constants/searchFields.ts` · `apps/frontend/src/app/api/admin/bulkLoadData/bulkLoadUtils.ts` · `apps/frontend/src/app/api/lib/utils.ts` · `apps/frontend/src/app/petitions/GeneratePetitionForm.tsx` · `apps/frontend/src/app/layout.tsx` · `apps/frontend/next.config.ts` · `apps/report-server/src/xlsxGenerator.ts` · `apps/report-server/components/DesignatingPetition.tsx`
**Why it hurts.** Dead text that readers must step over:
- About 68 commented-out lines in `fieldsConfig.tsx`, 24 in `searchFields.ts`, and 13 commented `console.*` lines plus a commented `deleteMany` block in the bulk voter-load utils.
- The `partyCodes`/`allowedParties` arrays in `apps/frontend/src/app/api/lib/utils.ts`.
- JSX-commented components: `DatePicker`, `KeyCapabilities`, `ThemeProvider`.
- A `:OHNO: look into this` in `next.config.ts`, which sits next to Next.js scaffold text about docker and appDir that no longer applies.
- "Legacy" XLSX wrappers with no callers, and an orphaned top-level `DesignatingPetition.tsx`.
- A dev-only `?variant=` prototype branch.
- About 8 TODOs with no ticket, one of them already partly done (`bulkLoadData`).
**Opportunity.** Delete dead code and either ticket each TODO or drop it.
**Evidence.** verify-A #28–#31; verify-BCD B4, C11, D27; verify-EFGH E10, E11, E19, G11, G12.

### 14. The test-comment contract in the type-safety skill is mostly unmet
**Severity: Low · Blast radius: medium**
**What & where.** `skills/test-type-safety/SKILL.md` sets the contract. The violations are in the frontend test tree.
**Why it hurts.** The skill asks for a short reason on suppressions and casts. In tests, 9 of the 10 `eslint-disable` directives are non-idiomatic and none of them gives a reason: three are file-wide (the invites, invite-route and applyPendingInvite tests) and the rest are line-level in the add, handleRequest and remove route tests. There are 155 `as never` and 140 `as unknown as` casts with only a handful explained, and 0 `@ts-expect-error` negative assertions. Only one of the 7 fake-timer sites says why, the committee-report test that pins the system time. The global `console.error = jest.fn()` in the Jest setup does not say what it is hiding. In product code, 1 of 9 `eslint-disable` directives uses the `--` reason form.
**Opportunity.** Give suppressions and casts the one-line reason the skill already requires.
**Evidence.** verify-EFGH H4, H5, H9, H10; verify-BCD C19; grep counts.

## Already good

These are the comments that define "earns its keep" here. They state a rule, a failure mode or a measured reason that the code cannot.

- **Authorization policy at the decision point.**
  - `apps/frontend/src/app/api/lib/recordSearchCommittees.ts` explains why `actingPermissions` never reaches the code and why the explicit Leader guard stops stale jurisdiction rows from leaking badges.
  - `apps/frontend/src/app/api/lib/resignationLetterAccess.ts` states who may read a letter and why ("it holds the member's signature and details").
  - The roster route's "POLICY: Contact info (email/phone) is Admin-only… flip this single predicate", with its twin in the committee detail route, puts the policy exactly where someone would change it.
  - `apps/frontend/src/app/admin/layout.tsx` explains a deliberately surprising acting-as-Leader outcome and the check that makes it safe.
- **Transaction and concurrency reasoning.**
  - `apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts`: "Always throws: the transaction is already aborted and must not be reused."
  - `apps/frontend/src/app/api/lib/membershipExit.ts`: "`?? null`: an undefined filter would match any report."
  - `apps/frontend/src/app/api/lib/seatUtils.ts` keeps `markSeatPetitioned` unexported "so the seat rule and the flag can't be skipped on a new path".
  - `apps/frontend/src/app/committees/workspace/useGridRefresh.ts` and `apps/frontend/src/app/committees/workspace/useCommitteeDetail.ts` state the stale-response and reload-detection rules.
- **External quirks, with the consequence.**
  - `apps/frontend/src/lib/s3Utils.ts`: "Without these, the SDK adds a CRC32 of the (empty) presign-time body to presigned PUT URLs…"
  - `apps/frontend/src/lib/electionConfigParsing.ts`: "`new Date(string)` and `Date.parse` appear NOWHERE in this module", with the reason.
  - `apps/frontend/src/app/admin/AdminSidebar.tsx`: `router.prefetch()` "is a full prefetch that Next reuses for up to 5 minutes".
  - `apps/frontend/src/app/api/admin/eligibility-flags/run/route.ts`: "Vercel's default would kill a county-wide rescan mid-write."
- **Measured reasons in the report-server.**
  - `apps/report-server/src/petitionFit.ts` documents its fit ladder; it was checked step by step against the code.
  - `apps/report-server/ecosystem.config.js` gives heap and restart limits with their measurements ("256 MB fails that export").
  - `apps/report-server/src/utils.ts`: "Always close Chrome, or a failed report leaves it running and eats the 1 GB box's memory", and "A function rather than a constant: index.ts loads .env after its imports are evaluated."
  - The shadow-rasterizing guard test's header gives the 5 MB to 19 MB and 46–49 s evidence.
- **Contracts in shared code.**
  - `packages/shared-prisma/src/committeeResidency.ts` gives the rule, every consumer and the browser-safe packaging constraint.
  - `packages/shared-validators/src/schemas/committeeRosterImport.ts` covers the wire versus DB shape and why objects are `.strict()`.
  - `packages/shared-validators/src/schemas/report.ts` explains the generic wrapper that erases the discriminant.
  - `packages/shared-prisma/src/committeeDesignationWeight.ts` lists the weight rules.
  - The partial-index and CHECK notes in `apps/frontend/prisma/schema.prisma` name their migrations.
- **Operator safety in scripts.**
  - `scripts/deploy-lightsail.sh` justifies each ordering step by the failure it prevents.
  - `scripts/pnpm-install-low-memory.sh` names the `CI=true` purge quirk.
  - `scripts/dev.sh` documents its bash-3.2 workarounds.
  - `apps/frontend/jest.pg.env.cjs`: "A remote POSTGRES_PRISMA_URL is never rewritten — that would target production".
- **Tests that say what they pin.**
  - The timezone date-utils test: "Guards the premise: if TZ didn't apply, the tests below prove nothing."
  - The roster-import tests narrate scenarios as invariants ("rollback scope is per-committee, not the whole import").

## Backlog-only notes

### B1. Long workspace and exit-report headers are valuable but verbose
**What & where.** `apps/frontend/src/app/committees/workspace/useGridRefresh.ts` · `apps/frontend/src/app/committees/workspace/CommitteeWorkspace.tsx`
**Why defer.** The content is accurate and earned. The 20-line headers only restate behaviour in their final sentences.
**Future direction.** Trim when those files are next edited.

### B2. Review tooling that parses source by regex has no comments
**What & where.** `scripts/check-api-route-wrappers.mjs` · `scripts/review/doctor.mjs` · `scripts/review/report-contract-matrix.mjs`
**Why defer.** These are internal tools with a small blast radius. Their regex-over-source parsing, such as the lazy `export const` match in the route-wrapper check, encodes implicit contracts that break silently.
**Future direction.** Add one header per tool saying what source shapes it assumes.

### B3. The legacy committees tree is thin, but it is scheduled for removal
**What & where.** `apps/frontend/src/app/committees/CommitteeSelector.tsx` · `apps/frontend/src/app/committees/page.tsx`
**Why defer.** About 2,000 code lines carry about 36 comments, but committees-workspace ticket 16 retires the legacy page, so comment work there would be wasted.
**Future direction.** Confirm the prototype directory and its dev branch go with the cutover.

### B4. File-header and comment-form conventions vary by module
**What & where.** `packages/shared-validators/src/fileUtils.ts` · `apps/report-server/src/index.ts`
**Why defer.** Three header conventions are in use: a `// path` banner, a `// Purpose:` block, and none. Headers sit on either side of `"use client"`. These differences are cosmetic.
**Future direction.** Pick one header form if a style guide is written.

## Not a finding

- **shadcn/Radix components/ui** (0.023 density). This is generated boilerplate, and sparse comments are correct there.
- **Set-state-during-render in the workspace and action drawer.** This is React's documented "store information from previous renders" pattern, and both sites already say why the state exists.
- **`useCommitteeDetail` failed-refresh handling.** The lane misread it: a current-generation failure does surface as `error`, as the header says.
- **Workspace `viewKey` JSON, and the Prisma HMR singleton in `apps/frontend/src/lib/prisma.ts`.** Both are standard and self-explanatory.
- **Petition-outcome "missing" rules (re-check guard, write-once latch).** The server schema and the record route already state them. Only a one-line pointer from the client copy would help.
- **Invite page "double-apply" risk.** The server path is idempotent (`already_applied`). The real gap, no retry after a failure, is in Finding 1.
- **`loadAdmin` as privilege escalation.** It is gated to Developer, the top privilege, and can only promote two existing accounts. The real issues are the stale comment and the missing audit row.
- **Voter-import raw SQL as an injection.** It is not injectable today (constant column list, doubled quotes, numeric coercion). Only the unstated assumptions are a finding.
- **"All `privilegeLevel ??` fallbacks are unreachable".** `?? Admin` is unreachable, but `?? ReadAccess` is live on `"Authenticated"` routes because that wrapper skips the missing-level check.
- **"onError already handles feedback" in empty catch blocks.** These explain why an error is swallowed, so they are not noise.
- **`plan §N` references in the committees UI.** All 37 resolve to existing plan headings. The finding is the format and the fragility (Finding 5), not staleness.
- **`seatPetitionDisplay` "still open".** This is accurate: the question is still open inside a resolved ticket, which is a tracker issue.
- **Near-zero comments in shared-validators tests and in `jobOrchestration.ts` helpers.** Descriptive test titles and pure functions make sparse comments acceptable. Only the schedule header is missing (Finding 12).
- **`auditLogGuard` not covering `createMany`.** Creating rows does not breach immutability, so that part of the lane claim was dropped.

## Escalations — code defects found incidentally

These are **outside the comments axis**. The lanes filed them as comment gaps, and the verifiers found that each is a code defect whose fix is a code change. Severities are a first estimate for routing; none was reproduced by running code.

- **E1. `sync-prisma` overwrites the hand-maintained shared-prisma index — Low.** `scripts/sync-prisma-models.js` · `packages/shared-prisma/src/index.ts`. The script writes a fixed template over the index. That template uses a type-only `Prisma` export where `new Prisma.Decimal` needs the value export, and it drops the four module re-export blocks. It then builds. It is wired into three `package.json` scripts and recommended in the scripts README. The script has not changed since the commit that added it, while the index has been edited by hand in at least seven later commits. Low because the damage is a loud build failure in a tracked file that git restores.
- **E2. `setup-dev-db.sh` sources `.env` and migrates whatever URL it finds — High.** `scripts/setup-dev-db.sh`. It runs `source` on the frontend `.env` and then `pnpm db_migrate` (`prisma migrate dev`) without pointing `POSTGRES_PRISMA_URL` at the container it started. A remote URL in `.env` or in the shell would receive unreleased migrations and possibly a reset prompt. High only under that condition, and a comment in the run-frontend skill's serve script records that `.env` has held remote URLs. Sourcing also executes every line of `.env` as shell, so a malformed line can echo a connection string to the terminal. Other dev scripts avoid both problems: `dev.sh` greps `.env` and `serve.sh` overrides the URL.
- **E3. The report-server `/start-job` endpoint does not verify the signature, and port 8080 is open — High.** `apps/report-server/src/index.ts` · `main.tf`. The handler gunzips, parses and enqueues any body without checking the `x-webhook-signature` the frontend sends. The server listens on `0.0.0.0`, and Terraform opens 8080 to the world, which bypasses nginx and TLS. A prior review (docs/WHOLE_APP_TRUST_BOUNDARY_REVIEW_gpt-5-codex_2026-07-08.md, rated High) and the SRS findings register already document this. No `.scratch` ticket tracks the fix. Whether the live instance's firewall matches `main.tf` cannot be checked from the repo.
- **E4. A GitHub token is in the clone URL — Medium.** `main.tf`. The repository is public, so the token is not needed. It still persists in the instance's git remote config, in `user_data`, which instance metadata exposes to local processes, in the setup scripts' environment and in local Terraform state. The impact depends on the token's scope, which the repo does not show.
- **E5. CI never runs the shared-prisma tests — Low.** `scripts/run-tests.ts` · `.github/workflows/test.yml`. The `PACKAGES` list omits `packages/shared-prisma`, so its residency, designation-weight and import-version suites never run in CI.
- **E6. The Jest `AuditAction` stub hides two enum values — Low.** The frontend Jest setup file (jest.setup.ts at the frontend root). The `@prisma/client` mock replaces the real enum with a hand-written list of 28 values. The schema has 30, and `MISSING_COMMITTEES_CREATED` and `SEAT_PETITIONED_BACKFILLED` are missing. The auditLog lib test builds its payloads and expectations from `SEAT_PETITIONED_BACKFILLED`, so it compares `undefined` with `undefined` and passes without testing the action field.
- **E7. The sign-in privilege sync fails open — Low.** `apps/frontend/src/auth.ts`. If the `PrivilegedUser` lookup or the update throws, the catch logs the error and sign-in returns `true` with the level stored on `User`. That can be a level whose `PrivilegedUser` row has since been removed. The impact is narrow: it grants nothing new, it needs a database error between two consecutive queries, and a full outage still blocks sign-in at the earlier lookup. Still, revocation fails open on a privilege path with no stated reason.
- **E8. The decisions route catches P2002 inside an interactive transaction — Medium.** `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts`. When an activation hits the one-active-membership-per-term index, the route records a per-item error and continues inside the same `$transaction`, with no savepoint. Postgres has already aborted the transaction. A following decision fails the whole batch with a 500, and if the conflict is the last item, the commit silently rolls back while the response reports earlier items as successful. That second outcome is reasoned from Postgres semantics, not reproduced. The conflict is reachable only through a concurrent activation in another committee, and no test covers it.
- **E9. A race on eligibility-flag dismiss — Low.** `apps/frontend/src/app/api/admin/eligibility-flags/[id]/review/route.ts`. The dismiss path reads the flag without a lock, checks that it is PENDING, and then updates unconditionally. Two concurrent dismissals both succeed and write two resolution audit rows. The remove path is protected by a conditional write.
- **E10. Audit CSV export: the formula guard breaks quoting — Low.** `apps/frontend/src/app/api/admin/audit/export/route.ts`. The tab prefix is placed outside the RFC-4180 quotes. A value that starts with a formula character and also contains a comma, quote or newline is therefore split by spreadsheets. The comment itself is accurate.
- **E11. `loadAdmin` changes privileges without an audit row — Low.** `apps/frontend/src/app/api/admin/loadAdmin/route.ts`. It sets two hard-coded accounts to Developer and writes no audit event, which an existing audit-coverage plan lists as an un-audited privilege change. The route has no app caller.
- **E12. The decisions route reports "at capacity" for a row it has already rejected — Low.** `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts`. After `confirmSubmittedMembership` commits the membership as REJECTED, the response says "Committee is at capacity", so the bulk-decision UI cannot tell an auto-rejected row from one that is still pending.
