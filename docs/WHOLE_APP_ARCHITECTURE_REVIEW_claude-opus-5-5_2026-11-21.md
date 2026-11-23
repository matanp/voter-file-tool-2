# Whole-App Architecture Review (hybrid: simplification, re-architecture, stability, performance, drift)

## Basis
- **Branch:** detached at `origin/main` · **Commit:** `dcedbdcc` · **Date:** 2026-11-21 · **Model:** `claude-opus-5-5`
- **Deliverable:** `docs/WHOLE_APP_ARCHITECTURE_REVIEW_claude-opus-5-5_2026-11-21.md`
- **Review run:** `.review/runs/WHOLE_APP_ARCHITECTURE_REVIEW_claude-opus-5-5_2026-11-21-dcedbdcc` (gitignored; rubric, mechanical scans, lane and verifier notes)
- **Inventory:** `pnpm review:freeze architecture` · 484 product files · manifest sha256 `6981dc8c96669da7402c2a552c7a553896e7b32f239baad79306e9c8619ba911`
- **Vector:** architecture (`docs/review/WHOLE_APP_ARCHITECTURE_REVIEW_METHODOLOGY.md`), run as a **hybrid**. The axis was widened from DRY / consistency / maintainability / extensibility to six questions: simplification, re-architecture, stability, performance, drift (code/code, code/docs, schema/usage, open findings from prior reviews) and moving complexity.
- **Scope:** product code plus infrastructure (Terraform, provisioning scripts, nginx, PM2 config, CI workflow, PDF-validation harness read lightly). Tests and `scripts/` are not review subjects; they were read only to understand intent.
- **Method:** 10 Sonnet discovery lanes (A API, B domain, C reports, D imports, E1 committees UI, E2 admin and frontend lib, F packages and schema, G infra, H1 docs drift, H2 prior reviews) → 3 Opus verifiers (ABF, CDG, E1E2H) whose verdicts and severities override lane claims → Opus synthesis (this document; re-opened code where verifiers disagreed or a proposal needed sharpening) → Fable final review.
- **Identifiers:** lane items keep their lane IDs (A-1, B-7, …). Items that a verifier added are prefixed with the verifier: ABF-N1, CDG-N2, EEH-N3 (E1E2H). REFUTED claims are dropped from the findings and listed under Not a finding.

## Direct answers

**Bottom line.** The app's good parts (membership exit, the shared report contract, the crosswalk and weighted-table imports, the three route wrappers) show the target design. Most of the risk sits where that design was not applied: the report-server trust boundary and job lifecycle, membership *entry* transitions, and the voter import. Fix the six High escalations first (E1–E4, E6, E7; all but E3 and E7 are S-sized), delete the dead code, and then do the three High re-architectures (Findings 1–3) in the order given in the roadmap.

**(a) Where can the app be simplified?** About **7,000 lines of product code in 22 files, including 6 API routes, can be deleted** with no loss of live behaviour (line counts re-checked with `wc -l` in final review). The lanes estimate that about 3,300 lines of tests go with them; that number was not recounted. Production runs `COMMITTEES_WORKSPACE=1`, so most of it is dead code behind that flag or throwaway code.

| Deletion | Files | Product LOC | Routes | Blocker |
|---|---|---|---|---|
| `_prototype/` layout variants (E1-2) | 7 | 3,304 | — | none (ticket 01 resolved) |
| Legacy committees UI: selector, add/request forms, summary, report button, the dead half of the roster table, flag branch in the page (E1-1, E1-11) | 5 (+1 split) | ~2,450 | — | `committees-workspace/16` (blocked only by 15, an unrelated a11y check) |
| Dead or legacy-only routes: `fetchCommitteeList`, `user/jurisdictions`, `designationWeight`, `loadAdmin`, `admin/scripts/specialVoterFile`, `bulkLoadData` + its utils (E1-4, A-7, D-1/F-7) | 7 | 851 | 6 | owner check for `designationWeight` |
| Smaller dead code: roster `includeRows=true` branch, weighted-table `ltedMatrix` branch, the orphan `apps/report-server/components/DesignatingPetition.tsx` (the live copy is under `src/components/`), `apps/report-server/start.sh`, `/admin/colors` (E1-4, D-11, C-13, G-12, EEH-N6) | 3 (+2 edits) | ~400 | — | none |
| Dead schema: `CommitteeRequest` and `VotingHistoryRecord` models, `VoterRecord.committeeId`, `VoterRecord.hasDiscrepancy` (F-2, CDG-N3, H1-14) | migration | — | — | remove the search field and UI column first |

The top simplification items after the deletions: collapse the eleven copy-pasted `processJob` branches into a handler map (Finding 4), make `enrichedReportVariants` derive from the request schema instead of being a second hand-synced list (Finding 4), replace the seven hand-rolled workspace fetch hooks with the existing `useApiQuery` (Finding 13), merge the two near-identical election-config panels (Finding 14), and use one bulk-write technique instead of four (Finding 7).

**(b) What should be re-architected for stability, performance or extensibility?** (1) **The report job lifecycle.** Today it is an in-memory queue, unconditional status writes from two processes, and fire-and-forget callbacks; a restart or OOM leaves rows stuck in PROCESSING for good. Make the `Report` row the state machine and the durable queue (Finding 3). (2) **Membership entry transitions.** Six entry paths use four concurrency idioms, and three of them have verified races. Give them one owner module next to the good `membershipExit` module (Finding 2). (3) **The API route contract.** Put the catch, Sentry reporting, error mapping, JSON parsing and typed params inside the existing three wrappers, so that routes stop copying one of five templates (Finding 1). (4) **The report-server dispatch.** Use one handler per report type, shared with the PDF-validation harness, with separate memory budgets for heavy jobs and PDF jobs (Findings 4 and 17). (5) **The committee roster import.** Split it into a pure plan over one batched snapshot and an ordered apply (Finding 7).

**(c) Where has the code drifted?**
- **Code vs code:** "is this caller an Admin" is computed four ways, so a Developer's `forceAdd` is silently ignored on three routes (A-4). Jurisdiction scoping has three helpers and nine call sites (A-5). There are six variants of the reactivation reset list (D-8). Validation produces four error envelopes (A-3). Labels and dates are duplicated, and the discrepancy UI's label keys no longer match the server's, so most labels render blank (D-10, E2-4, E2-5).
- **Code vs docs:** `apps/report-server/AI_README.md` describes a synchronous single-report service (H1-1). `adding-reports` points to a directory that doesn't exist (H1-7). The glossary says exactly one term is active, and nothing enforces it (H1-3). `CLAUDE.md` and `AGENTS.md` have diverged (H1-6). About 20 stale docs should be archived (H1-15).
- **Schema vs usage:** `VoterRecord` has no secondary index (F-1). Seat occupancy and the single active term have no DB constraint (F-3). `hasDiscrepancy` is only ever written `false` (CDG-N3). `REPORT_GENERATED` has no writer (A-9). The voter column list is hand-mirrored in about 8 places (F-6). The audit log is read back as application state (F-4).
- **Prior reviews:** of 27 deduped July findings, **15 are still open, 7 partial, 2 fixed and 2 not re-checked** (H2). The open ones include the unverified `/start-job`, the `generateReport` privilege hole, the report status races, unpersisted failure reasons, unscoped Ably tokens, seat uniqueness, env validation and migrate deploy, report-server Sentry, and voter-import cleanup. Most of them have no ticket.

**(d) Where should complexity move?**
- **Out of route handlers.** Domain rules move into `api/lib` services, and error and envelope handling into the wrappers (Findings 1 and 22).
- **Out of hand-synced lists.** Report types, voter columns, discrepancy keys, enum labels and per-type privileges each get one table that the others derive from (Findings 4, 5, 8 and 14).
- **Into the database.** Seat and term uniqueness become partial unique indexes, audit immutability becomes a trigger, and the job queue becomes `Report` rows. That removes the "every writer must remember the lock" rule (Findings 3, 9 and 10).
- **Out of the client.** Role tables move into one capabilities module, and the client fetch logic into one hook (Findings 5 and 13).
- **Off the box.** Provisioning becomes a built bundle plus a systemd unit instead of eight sourced shell scripts (Finding 18).

## At a glance

| # | Finding | Severity | Blast | Opportunity |
|---|---------|----------|-------|-------------|
| 1 | No canonical route shape; wrappers only gate | High | large | Catch/map/report inside the three wrappers |
| 2 | Membership entry transitions have no owner | High | large | `membershipTransitions` beside `membershipExit` |
| 3 | Report job lifecycle split across two processes and memory | High | large | Report row as state machine and queue |
| 4 | Report-server dispatch and report registry hand-mirrored | Medium | medium | Handler map; derive enriched schema |
| 5 | Authorization rules re-derived per route and client | Medium | large | One policy table per rule |
| 6 | Legacy committees UI, prototype and dead routes on main | Medium | large | Delete ~7k LOC, 6 routes |
| 7 | Roster import fuses plan/apply; four bulk-write styles | Medium | medium | Pure plan over a snapshot; one helper |
| 8 | 43-column voter schema mirrored by hand | Medium | medium | One column manifest |
| 9 | Load-bearing invariants live in code or raw SQL only | Medium | medium | Partial uniques plus a constraint test |
| 10 | Audit log doubles as state; coverage policy implicit | Medium | medium | Trigger guard; state into columns |
| 11 | Package boundaries blurred | Low | medium | Narrow shared-prisma; topo builds |
| 12 | Domain logic and inverted layering in routes | Medium | medium | Services in `api/lib`; fix imports |
| 13 | Client fetch layer exists but is half adopted | Medium | large | Extend `useApiQuery`; drop raw fetch |
| 14 | Admin CRUD, label maps and dates duplicated | Low | medium | Panel hook; shared label/date modules |
| 15 | Workspace re-drains whole scope per page and mutation | Low | medium | One-shot rollups; patch one row |
| 16 | Query shapes outgrew indexes and ordering | Medium | medium | Indexes after EXPLAIN; tiebreakers; push filters down |
| 17 | Report-server process runtime unbudgeted | Medium | medium | Heavy/PDF semaphores; health; shutdown |
| 18 | Provisioning is eight sourced scripts on the box | Medium | medium | Bundle + systemd (tickets 14/15/26) |
| 19 | Configuration unvalidated on both apps | Medium | medium | Full env schemas; fail fast |
| 20 | Docs drifted and stale docs crowd live ones | Medium | medium | Fix six docs; archive the rest |
| 21 | Upload and storage lifecycle has no owner | Medium | small | One presign helper; delete and expire |

**Counts:** 21 findings (3 High, 15 Medium, 3 Low) · 17 backlog-only notes · 18 escalations (6 High, 11 Medium, 1 grouped Low)

## Escalations — defects found incidentally (ranked)

These are concrete defects, not maintainability findings. They are ranked by impact: severity, then exposure. The severity labels route the work and come from the verifiers, except E5, which the final review lowered to Medium (its ID and position are kept so cross-references stay stable). The structural fix for each defect is in the finding it points to; this table gives only the in-place fix. Except where marked, the items were confirmed by reading code, not by running it. Ticket status was checked in this worktree's `.scratch/` and, read-only, in the main checkout. "(untracked)" means the ticket exists only in the main checkout's untracked `.scratch/`.

| # | Defect | Sev | Concrete fix | Ticket |
|---|---|---|---|---|
| E1 | **Report-server trust boundary is open.** `/start-job` gunzips, parses and enqueues any body with no signature check. The frontend's MAC covers UTF-8 of a latin1 decode of the gzip bytes, so a natural `update(req.body)` verifier would never match. `gunzipSync` has no `maxOutputLength`: a 2 MB body can inflate to about 2 GB of Buffer on a 1 GB box (Buffers sit outside the 384 MB heap cap). Port 8080 is open to the internet in `main.tf`. The `/start-job` schema (`enrichedReportDataSchema`) also accepts `voterImport` and the worker-only `boeEligibilityFlagging` variant, so anyone who can reach the port can start an import or countywide flagging. (C-2, G-1, H2-1, CDG-N1) | High | Deploy in this order, because the worker ignores the header today: (1) the frontend signs the gzip **Buffer** (`createWebhookSignature(gzippedBuffer, …)`; the helper already accepts a Buffer); (2) the worker verifies `x-webhook-signature` over the raw `req.body` Buffer with `timingSafeEqual` **before** decompressing, requires `WEBHOOK_SECRET` at boot, and calls `gunzipSync(body, { maxOutputLength: 8 MiB })`, returning 413 on overflow; (3) once `PDF_SERVER_URL` is confirmed to go through nginx on 443, bind to 127.0.0.1 and close 8080. Later: send `application/octet-stream` (change the `express.raw` type with it) and move create/verify into shared-validators. | None that fixes it. Routed but untriaged as E3 in `.scratch/code-comments-review/issues/01-triage-comments-review-findings.md` (untracked). |
| E2 | **`generateReport` privilege gaps.** The route is `RequestAccess`. Only `ldCommittees`, the petition types and the scoped types have extra gates. A RequestAccess user can therefore submit `voterImport` with a caller-chosen `fileKey`, `year` and `recordEntryNumber`, and that job **writes `VoterRecord`**. The same user can also bulk-export `voterList` and `absenteeReport`. Upload keys are not bound to the uploader. (C-1, H2-2) *Added in final review:* neither the route nor the worker checks the key's prefix, and all objects share one bucket. A RequestAccess user can get a presigned PUT under `resignation-letters/staging/` (it signs only the content type and length, not the content), so the import can probably be pointed at a file the caller wrote. This chain was read, not exercised. | High | Add `REPORT_MIN_PRIVILEGE: Record<ReportType, PrivilegeLevel>` in shared-validators, exhaustively typed, and enforce it in the route in place of the ad-hoc `if`s. `voterImport` and `absenteeReport` are Admin (their upload-URL routes already are); decide the level for `voterList`. In the same change, reject a `fileKey` that doesn't start with `voter-file-uploads/` (and the matching prefix for `csvFileKey`), in the route and again in the worker. Later, bind keys to the uploader with a user id in the prefix or a recorded issuance row. | None |
| E3 | **Access can't be revoked.** `signIn` returns `true` for every existing `User`. A user without a `PrivilegedUser` row is only demoted to ReadAccess, which can still page the whole voter file, phones and DOBs included. There is no disable column, no revoke route, and no code path that removes a `PrivilegedUser` row. Removing one by hand takes effect only at the user's next sign-in, because `User.privilegeLevel` is synced only in `signIn` and the session callback reads the cached value; database sessions last 30 days by default. `AuditLog.user` and `Report.generatedBy` have no `onDelete` (Prisma's default is `Restrict`), so a user who ever acted can't be deleted either. The `signIn` catch fails open. (ABF-N1, A-8, F-5) | High | Stopgap today: write down the manual procedure (delete the user's `Session`, `PrivilegedUser` and `UserJurisdiction` rows and set `User.privilegeLevel` to ReadAccess), and make the catch fail closed. Proper fix: add `User.disabledAt`, or a `NoAccess` level below ReadAccess. `signIn` and `session` reject a disabled user. Add an Admin "Revoke access" action that deletes `Session`, `UserJurisdiction` and `PrivilegedUser` rows and writes `PRIVILEGE_REVOKED`. Fail closed in the catch. Document the procedure in `skills/auth-check-patterns/SKILL.md`. | None. The fail-open half is E7 in the comments triage (untracked). |
| E4 | **Double accept can reject the member it just seated (B-1).** `confirmSubmittedMembership` checks `SUBMITTED` before it takes the committee lock, then writes unconditionally. With two confirms racing on the last free seat (a double click, two tabs, or single plus bulk), the second one counts the first's member, hits capacity, and overwrites the now-ACTIVE row with `REJECTED` / "Committee already full". The row keeps its seat number; no CHECK ties `seatNumber` to ACTIVE (migrations re-checked in final review). Without the capacity edge, the second confirm re-seats the member and writes a second audit pair. | High | After the `FOR UPDATE`, re-read the row and return `notSubmitted` unless it is still SUBMITTED. Make both writes `updateMany where {id, status: SUBMITTED}` and check `count`. Size S. | None |
| E5 | **Bulk meeting decisions can fail as a whole batch (B-3, A-6).** The decisions route runs all items in one interactive transaction with the default 5 s timeout and no `.max()` on the array. Each confirm is roughly 15–20 round trips, so a large reorganization batch will probably exceed 5 s and return a clean 500 with nothing applied (estimated, not measured). Separately, the route catches a P2002 inside the transaction and continues, with no savepoint. That P2002 needs a concurrent activation of the same voter in another committee, because the in-transaction check catches the non-racing case. When it does happen, the next item fails with 25P02 and the batch returns 500. If it happens on the **last** item, Postgres answers `COMMIT` with a rollback and the route probably returns 200 with `success:true` rows that were all rolled back; that outcome is reasoned from Postgres and Prisma 5.15 behaviour, not tested. *Lowered from High in final review:* the likely failure is clean and the false success needs a race on the last item. | Medium | Open one `$transaction` per decision, with the eligibility pre-check before each one, and catch P2002 outside the transaction. Add `.max(200)`. If the meeting needs all-or-nothing, keep a single transaction with `{ timeout: 60_000 }` and let P2002 abort, as `bulkLoadUtils.ts` already documents. Confirm with one `test:pg` case. | Routed as E8 in `.scratch/code-comments-review/issues/01-triage-comments-review-findings.md` (untracked) |
| E6 | **Two heavy report jobs can OOM the report-server.** The 384 MB heap is sized for one 20k-row export (~300 MB, per the comment in `apps/report-server/ecosystem.config.js`), and `QUEUE_CONCURRENCY = 2` lets two `voterList`, `voterImport` or roster-xlsx jobs run at once. The trigger is two large exports overlapping, which two users or one double submit can cause. The heap abort kills both jobs and drops the in-memory queue (E8). Chrome runs outside PM2's memory accounting. (C-10, C-3, G-2) | High | Use two semaphores: `heavy` (voterList, voterImport, absentee, roster/ld xlsx) = 1 and `pdf` = 1, keeping total concurrency at 2 for a mixed load. `heavy = 1` also single-flights `voterImport`, which closes E7 (4). Finding 17 has the structural part. | `.scratch/report-server-provisioning/issues/09-render-one-pdf-at-a-time.md` (Chrome only) · `24-large-report-ram-pressure.md`, `25-restart-loses-queued-reports.md`, `27-untagged-pdfs.md` in the same folder (untracked, needs-triage) |
| E7 | **Voter import can leave half-written data (D-2, F-6, D-14, CDG-N5).** (1) An empty date or a duplicate VRCNUM in one batch throws mid-stream with no row number, after earlier batches committed. Nothing wraps the archive and update writes in a transaction, and the error path `console.log`s the full voter record. (2) A corrected file re-uploaded under the same year/entry never applies, because `isRecordNewer` uses strict `>`. (3) The bulk UPDATE's `VALUES` list types an all-NULL column as `text`, so a small update batch where an integer or timestamp column (`houseNum`, `electionDistrict`, `lastUpdate`) is NULL in every row fails (reasoned from Postgres typing rules, not run). The archive rows are already written by then, so a retry hits the archive unique key. (4) The dropdown accumulator is a module singleton, so two concurrent imports (concurrency is 2) corrupt each other. (5) The scheduled BOE re-scan can run against a half-applied import. | High | Validate and collect rejects before applying, with row numbers. Use `>=` for the same entry. Add `skipDuplicates` on the archive and a last-wins dedupe per batch. Use the parameterised `unnest($1::int[], …)` form already used by the crosswalk and weighted-table imports. Create the accumulator per import. Single-flight `voterImport` and skip the BOE timer while an import runs. | None (July finding still open, H2 #13 and #22) |
| E8 | **Report rows get stuck or are misreported (C-4, C-5, A-11, H2-7, CDG-N4).** The frontend writes PROCESSING after the worker acks, so a job that fails fast leaves the row in PROCESSING. The worker's success callback shares a `try` with the job, so a failed callback sends a `success:false` for a file that is already uploaded. Callbacks have no retry. The FAILED branch stores no reason. The enqueue `fetch` has no timeout, and a non-JSON nginx 502 marks a job FAILED that the worker is still running. `message: error` leaks a raw error object to the client. An unset worker `WEBHOOK_SECRET` makes the frontend reject every callback, so rows stay PROCESSING. | Medium | Write PROCESSING before the POST. The callback accepts `status in (PENDING, PROCESSING)` through `updateMany` plus `count`. Use one `sendCallback` with a timeout and bounded retry, separate from the job's `try`. Persist the failure reason. `AbortSignal.timeout` on enqueue, and parse the reply with `generateReportResponseSchema`. Finding 3 has the structural fix. | Restart half: `25-restart-loses-queued-reports.md` (untracked). Failure-reason UI: `.scratch/reports-polish/issues/01-failed-jobs-and-service-errors.md`. The races are untracked. |
| E9 | **Petition Outcomes report lists every losing and tied candidate twice (CDG-N2).** The recorder writes `petitionSeatNumber` for all candidates. `fetchPetitionOutcomesData` then collects those rows and appends a second query for LOST/TIE under the same key, so the count is inflated too. | Medium | Use one query with `OR`, deduplicated by membership id, with the scope pushed into `where` (C-8). Add a fixture with a recorded loser. | None |
| E10 | **A petition outcome can put two ACTIVE members in one seat (B-4, H2-5, F-3).** The holder check runs outside the transaction. The transaction never locks `CommitteeList`, and the winner is written ACTIVE with a seat number, bypassing `activateMembershipInSeat`. No DB constraint backs seat occupancy, and none backs the single active term either: concurrent activations under READ COMMITTED can leave two terms active. | Medium | Lock the list first and re-check inside the transaction. Add a `forceSeat` mode to `activateMembershipInSeat`. Add partial unique indexes on `(committeeListId, termId, seatNumber) WHERE status='ACTIVE' AND seatNumber IS NOT NULL` and on `CommitteeTerm((true)) WHERE "isActive"`, each preceded by a duplicate check. | None |
| E11 | **`requestAdd` resubmit race (B-2).** It updates `where {id}` from a read taken outside the transaction and has no P2002 handling on create. | Medium | Use a conditional `updateMany` on the expected status inside the transaction, and map P2002 to 409. | None |
| E12 | **Roster import removes a sitting member whose row was rejected (D-6).** It happens in a committee that has other valid rows (corrected: a committee whose *only* row was rejected is left untouched). The tool is local-only and has a dry run. | Medium | Exempt removals in any committee with a parsed-identity reject. Block apply on rejects with an unknown committee unless `allowRejectedRows` is set. | None (spec silent) |
| E13 | **Leader-callable legacy endpoint leaks contact info and DOB (H2-3, EEH-N4).** `fetchCommitteeList` returns the committee with each active member's full voter record, while the live `/detail` route gates contact info to Admin. It is scoped to the Leader's own jurisdiction and has no live UI caller. | Medium | Delete it, together with `user/jurisdictions`, `designationWeight` and `_prototype`, now. Split this out of ticket 16. | `.scratch/committees-workspace/issues/16-cutover-and-cleanup.md` (open; recommend a split) |
| E14 | **Ably tokens have no capability (C-12, ABF-N3, H2-4).** Any signed-in user can subscribe to any `report-status-<jobId>` channel, which carries the presigned file URL. If the key allows publish, a user can also publish forged "complete" messages with an arbitrary URL. Job ids are cuids, which keeps the likelihood low. The public report listing also returns other users' `generatedBy.email`. | Medium | Set `capability: { "report-status-<userId>-*": ["subscribe"] }` and rename the channels, or drop Ably in favour of the existing `reportJobs` polling. Remove the email from the public projection. | None |
| E15 | **No audit trail or throttling on bulk PII reads (ABF-N2).** `fetchFilteredData` and `generateReport` write no audit row, and there is no rate limit anywhere. Combined with E3, a stale account can page the voter file unrecorded. | Medium | Write `REPORT_GENERATED` on enqueue, plus a sampled `VOTER_SEARCH` row. Add a per-user token bucket on both routes. | None |
| E16 | **Secrets in plaintext (G-9, G-5).** Terraform `user_data` and state hold the DB URL, the R2 keys and the webhook secret. A GitHub PAT sits in the clone URL and persists in the instance's `.git/config`. `webhook_secret` defaults to `""`. | Medium | Strip the PAT with `git remote set-url` (or use a deploy key, since the repo is public). Move secrets out of `user_data`. Make `webhook_secret` required. | `.scratch/config-and-secrets/issues/04-terraform-inputs-and-state.md` and `05-report-server-runtime-config.md` (untracked, open) · `.scratch/leader-feedback-2026-11/issues/28-rotate-exposed-neon-password.md` (untracked) |
| E17 | **Record search can repeat or skip voters, and shows errors as "No results" (EEH-N1, EEH-N2).** `ORDER BY firstName, lastName` has no unique tiebreaker across `skip`/`take` pages. A load-more still in flight appends the old query's rows to a new search. Load More isn't disabled while loading. A 500 or a timeout renders as "No results found". `useSearchState`'s flattener keeps only the first sub-field, and `RecordsList` overwrites it straight afterwards. | Medium | Add `{ VRCNUM: "asc" }` as the last sort key and run `count` in parallel. Use one search controller with a request id. Disable Load More while loading and add an error state. Delete the lossy flattener. | None. Possibly related to the open BUG-002 in `docs/BUGS.md`. |
| E18 | **Lower-impact defects, grouped.** `useApiMutation` rethrows after `onError`, so 19 `void x.mutate()` sites raise unhandled rejections (EEH-N3; `.scratch/sentry-setup/issues/04-usemutation-unhandled-rejections.md`, untracked, ready-for-agent). Seat reconciliation reads `maxSeats` before the lock and takes no committee locks (B-5). `persistDiscrepancies` deletes **every** unresolved discrepancy, not just this import's (D-9). The discrepancy UI label keys don't match the server keys, so labels render blank (D-10). A Developer's `forceAdd` is ignored (`=== Admin`) on add, requestAdd and handleRequest (A-4). `electionDates` maps a DB outage to 400 (A-3). `committee/add` upserts the `CommitteeList` before it checks eligibility (A-14). `withPrivilege` returns the user's email in a 500 body, and Sentry traces sample at 100% in production (ABF-N5). | Low | One line each, in the IDs cited. | as noted |

## Subsystem map

| Area | Defining surfaces | State at `dcedbdcc` |
|---|---|---|
| API surface | 68 route files / 79 methods, three wrappers, `api/lib` helpers | Every method wrapped; bodies copy five templates; ~10.7k LOC routes vs ~3.8k LOC lib |
| Committee domain | membership exit, confirmation, seat selection, petition outcomes, reconciliation | Exit side is a deep module; entry side scattered with races |
| Reports | shared registry and schemas, `generateReport`, `reportComplete`, report-server queue and renderers | Contract is shared and parsed both ends; lifecycle and dispatch are not |
| Imports | voter file package, dev fork in frontend, roster import, crosswalk/weights | Crosswalk and weights are model imports; voter and roster imports are not atomic |
| Committees UI | workspace (live), legacy selector tree, prototype | Workspace is solid; legacy and prototype are dead weight |
| Admin and frontend lib | admin pages, hooks, date and label helpers, record search | One blessed hook pair, half adopted |
| Packages and schema | shared-validators, shared-prisma, voter-import-processor, Prisma schema and migrations | Strong partial constraints where they exist; two core invariants missing |
| Infrastructure | Terraform, eight provisioning scripts, nginx, PM2, CI | Works; not re-runnable or reboot-tested; secrets in `user_data` |
| Docs | CONTEXT, ADRs, skills, AI_README, SRS, ~40 root docs | ADR 0002 and the reports skill are accurate; several high-traffic docs are stale |

## Findings

### 1. Every route re-implements parse, validate, catch and error mapping; the wrappers only gate
**Severity: High · Blast radius: large · Axis: re-architecture / drift-code**
**What & where.** `apps/frontend/src/app/api/lib/withPrivilege.ts` · `apps/frontend/src/app/api/lib/validateRequest.ts` · `apps/frontend/src/app/api/admin/electionDates/route.ts` · `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts` · `apps/frontend/src/app/api/committee/requestAdd/route.ts` · `apps/frontend/src/app/api/generateReport/route.ts` · `apps/frontend/src/instrumentation.ts`
**Evidence.** A-1, A-2, A-3, A-15, B-12, H2-9, ABF-N5, EEH-N5.
- Only 12 of 68 route files call `Sentry.captureException`. 51 of the 63 route files that `catch` never call it and log with `console.*` only, so `onRequestError` never sees those failures (recounted in final review). `withBackendCheck` also swallows webhook errors to the console.
- About 14 of the 33 route files that call `req.json()` do so unguarded.
- Validation failures come back four ways: 422 with `fieldErrors`, 400 with `issues`, 400 with `details`, or a first-issue string. `electionDates` turns every non-P2002 error into a 400.
- 12 dynamic route files cast `contextArgs[0]`. 26 handlers take `Session` and re-check `user.id`, each with its own 401 body.
- `pnpm check:api-routes` checks that a wrapper exists, but CI doesn't run it (EEH-N5).
**Why it matters.** Each new route picks one of about five templates. Production 500s from most routes never reach Sentry, including the two most race-prone committee routes (B-12). Clients can't share error handling.
**Proposal.** Keep the three wrapper names, because the check script matches them literally. Add one internal `runHandler(op, fn)` used by all three. It maps:
- `HttpError` to its status with `{error, code}`;
- P2002 to 409 and P2025 to 404;
- `ZodError` to 422 with `fieldErrors`;
- anything else to Sentry plus a generic 500.

Type `withPrivilege<P>(level, (req, session: SessionWithUser, {params}) => …)` so the 12 casts and the redundant session checks go away. Add `readJson(req, schema)` as a body helper. Migrate route by route by deleting each generic `catch`. Extend `check:api-routes` to flag a `catch` that returns 500 without Sentry or a rethrow, and add it to `.github/workflows/test.yml`. **First step:** two changes that need no route edits: `Sentry.captureException` in `withBackendCheck`'s catch, and `pnpm check:api-routes` as a CI step. **Size:** S for the wrappers, then S per route. **Order:** delete the legacy routes first (Finding 6), so there are fewer routes to migrate.

### 2. Membership entry transitions have no single owner, and the pieces use four concurrency idioms
**Severity: High · Blast radius: large · Axis: re-architecture / stability**
**What & where.** `apps/frontend/src/app/api/lib/membershipConfirmation.ts` · `apps/frontend/src/app/api/lib/membershipExit.ts` · `apps/frontend/src/app/api/lib/seatUtils.ts` · `apps/frontend/src/app/api/committee/add/route.ts` · `apps/frontend/src/app/api/committee/requestAdd/route.ts` · `apps/frontend/src/app/api/committee/handleRequest/route.ts` · `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts` · `apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/route.ts` · `apps/frontend/src/app/api/lib/membershipHistory.ts` · `apps/frontend/src/lib/eligibility.ts`
**Evidence.** B-7, B-6, D-8, A-6, B-8, B-9, B-11.
- `committeeMembership` is written from five modules and three raw route sites.
- The concurrency idioms differ: the exit side uses a conditional write plus lock-and-reread; confirm uses a lock then an unconditional write; `requestAdd` and the petition path take no lock at all.
- The reactivation reset list exists in **six** variants. The petition recorder clears letters only for RESIGNED.
- The "Admin plus `forceAdd`" override block is copied three times.
- `validateEligibility` runs on the global client, outside the transaction.
- The audit rows each path emits differ (direct add: ACTIVATED; accept: CONFIRMED plus ACTIVATED; petition: PETITION_RECORDED plus a conditional ACTIVATED). `membershipHistory.ts` special-cases each combination.
**Why it matters.** The three verified races (E4, E10, E11) all sit on this side, while the exit side, which has an owner, has none. Adding a lifecycle column means editing four to six routes and relying on a CHECK constraint to catch the one that forgets. A new entry path silently leaves a gap in History.
**Proposal.** Add a `membershipTransitions.ts` module next to `membershipExit.ts`. Its exports are the only entry transitions: `submit`, `resubmit`, `confirm`, `reject`, `directAdd`, `recordPetitionResult`. Each one:
- takes `tx`;
- takes the list lock itself, list first and then membership;
- runs eligibility on `tx`;
- applies one exported `CLEARED_LIFECYCLE_FIELDS`;
- writes conditionally and returns a typed result;
- emits audit rows through one `describeTransition()`, so `membershipHistory` reads a single contract.

`activateMembershipInSeat` stays the only seat writer and gains a `forceSeat` mode. Routes shrink to parse, authorize, call, and map the result. `handleRequest` and the decisions route share a `decideSubmission()`. **First step:** the E4 fix inside `confirmSubmittedMembership`; that function then becomes the first extracted transition. **Size:** L, done incrementally. **Order:** fix E4, E5, E10 and E11 in place first, and add the DB backstops from Finding 9. Then extract one transition at a time, starting with confirm.

### 3. The report job lifecycle is split across two processes, an in-memory queue and unconditional writes
**Severity: High · Blast radius: large · Axis: re-architecture / stability**
**What & where.** `apps/frontend/src/app/api/generateReport/route.ts` · `apps/frontend/src/app/api/reportComplete/route.ts` · `apps/frontend/src/app/api/reportComplete/reportCompleteVerifier.ts` · `apps/report-server/src/index.ts` · `apps/report-server/src/webhookUtils.ts` · `apps/report-server/src/jobOrchestration.ts` · `apps/frontend/src/app/components/ReportStatusTracker.tsx`
**Evidence.** C-3, C-4, C-5, A-11, H2-1, H2-7, G-2, CDG-N4, CDG-N5.
- The PENDING, PROCESSING, COMPLETED and FAILED transitions are written by two processes: the frontend at create and after the ack, and the callback route at the end.
- Each of those writes is `update where {id}` after a separate read.
- The queue is `async.queue` in memory. Restarts are expected by design (the heap cap plus `max_memory_restart`), deploys run `pm2 delete` and `pm2 start`, and there is no SIGTERM handler.
- Nothing sweeps stale rows. The callback refuses any row that isn't PROCESSING, so a late callback can't repair a row either.
- The scheduled BOE re-scan shares the queue with imports.
**Why it matters.** Every restart, deploy, OOM (E6) or fast failure (E8) leaves a row PROCESSING for good. The user sees a spinner and no reason. This is the July Tier-1 chain, and it is still open.
**Proposal.** One `reportJob` transition module in the frontend, used by both routes: `markProcessing`, `complete` and `fail(reason)`, each an `updateMany` guarded on the allowed prior statuses that branches on `count`. Persist the failure reason. Then make the `Report` row the queue:
- store the enriched payload, or enough to rebuild it, on `Report` or in a small `ReportJob` table;
- the worker claims rows with `FOR UPDATE SKIP LOCKED` and a `startedAt` lease;
- the frontend POST becomes "create the row, then nudge the worker";
- a lease-expiry sweep re-queues or fails stale rows;
- the BOE timer becomes a claimable row that won't co-run with an import.

The callback gets a timeout and retry, separate from the job's `try`. Ably becomes optional, since `reportJobs` polling already works. `docs/POSTGRES_QUEUE_MIGRATION_PLAN.md` already describes the current state and is a starting point. **First step:** write the transition module and call it from `generateReport` and `reportComplete`; this is also the E8 fix. **Size:** S for the transitions, M for the durable queue. **Order:** the queue comes after E1, since both edit the `/start-job` handler, and goes together with ticket 25.

### 4. Report-server dispatch and the report registry are hand-mirrored in several places
**Severity: Medium · Blast radius: medium · Axis: simplification / extensibility**
**What & where.** `apps/report-server/src/index.ts` · `apps/report-server/src/committeeMappingHelpers.ts` · `apps/report-server/src/utils.ts` · `packages/shared-validators/src/schemas/report.ts` · `packages/shared-validators/src/scopeReportRegistry.ts` · `apps/frontend/src/components/reports/scopeReportUiRegistry.ts` · `apps/frontend/src/components/reports/scopeReportFormSpecs.ts` · `apps/frontend/src/components/reports/ScopedReportForm.tsx` · `apps/report-server/pdf-validation/src/callShapes.ts`
**Evidence.** C-6, C-7, C-9, C-13, C-14, G-10, H1-7.
- `processJob` is a ~300-line chain that repeats the same scaffolding eleven times. The jurisdiction check is repeated in three layers.
- The harness's `callShapes.ts` describes itself as a "MIRROR of processJob".
- `enrichedReportVariants` is a second discriminated union, marked "Keep this list in sync". `extraFields` has no reader.
- Adding a scoped report touches about 12 files and 17 edit sites. The adding-reports skill under-counts that and points to a `scopeReportHandlers/` directory that doesn't exist.
- The scope `where` construction is copied six times, and the scope title is built three ways.
- `ScopedReportForm` is a 670-line per-type switch, and five forms re-implement the generate mutation plus tracker wiring.
**Why it matters.** Today, forgetting the worker branch is a runtime "Unknown job type", not a compile error. The validation harness can quietly test a different call shape than production runs.
**Proposal.** Add `REPORT_HANDLERS: { [T in EnrichedReportData['type']]: Handler<T> }`, one module per report holding fetch, HTML/XLSX rendering and page options. `processJob` then reduces to a lookup plus the callback. The harness imports the same handlers with injected `render` and `fetch` seams, and `callShapes.ts` is retired. Derive `EnrichedReportData` as `GenerateReportData & {reportAuthor, jobId}` plus the one worker-only variant, and drop `extraFields`. Add `scopeWhere()` and `fetchScopedCommittees()` in the worker and `describeScope()` in shared-validators. On the frontend, use per-type extras components and a `useGenerateReport()` hook. Target: about 5 edit sites per new report. **First step:** move one branch (`signInSheet`) into a handler module that both `processJob` and `callShapes.ts` call, to prove the seam. **Size:** M. **Order:** after E1 (same file). The handler map also lands the heavy/PDF semaphore split (Finding 17).

### 5. Authorization rules are re-derived per route and again on the client
**Severity: Medium · Blast radius: large · Axis: drift-code / move-complexity**
**What & where.** `apps/frontend/src/app/api/generateReport/route.ts` · `apps/frontend/src/app/api/lib/committeeValidation.ts` · `apps/frontend/src/app/api/lib/committeeRead.ts` · `apps/frontend/src/app/api/committee/roster/route.ts` · `apps/frontend/src/app/api/committee/[committeeListId]/detail/route.ts` · `apps/frontend/src/app/api/committee/memberSearch/route.ts` · `apps/frontend/src/app/committees/workspace/adapters.ts` · `apps/frontend/src/auth.ts`
**Evidence.** C-1 (structural half), A-4, A-5, E1-8, E1-9, F-5, H1-5.
- The per-report-type minimum privilege lives in three ad-hoc `if`s; E2 is the resulting hole.
- "Is this caller an Admin?" is computed four ways: `=== Admin`, `Admin || Developer`, `hasPermissionFor` and `isActualAdmin`. Behind them sit 23 unreachable `?? PrivilegeLevel.Admin` fallbacks under `app/api`.
- `getUserJurisdictions` has 9 call sites, using three helpers with different `null` conventions.
- The client mirrors the role tables in about 13 `hasPermissionFor` calls across 10 workspace files. All of them are display-only and re-checked on the server.
- Grants live in two tables. `User.privilegeLevel` is a cache of `PrivilegedUser`, synced only at sign-in.
- The auth skill doesn't mention `withBackendCheck`, `withPublic` or `"Authenticated"`.
**Why it matters.** Behaviour already differs: a Developer gets admin treatment on roster and detail but not on `forceAdd`. Each new endpoint has to pick a variant and remember the conventions, and SRS 3.1 is a security rule.
**Proposal.**
- One exhaustive `REPORT_MIN_PRIVILEGE` table (it closes E2 by construction).
- One `isAdminSession(session)` predicate, with the gated session typed so the fallbacks can be deleted.
- One `CommitteeScope` object built once per request: `scope.allows(c)`, `scope.where()`, `scope.unrestricted`.
- One client `committeeCapabilities(actingPermissions)` module. A server-sent capabilities block is more than this needs for now (verifier).
- Pick one source of truth for grants as part of E3.
- Add three lines to the auth skill.

**First step:** `REPORT_MIN_PRIVILEGE` (E2). **Size:** S for each table and predicate, M for the scope object.

### 6. The legacy committees UI, the throwaway prototype and dead routes are still on main
**Severity: Medium · Blast radius: large · Axis: simplification**
**What & where.** `apps/frontend/src/app/committees/page.tsx` · `apps/frontend/src/app/committees/CommitteeSelector.tsx` · `apps/frontend/src/app/committees/AddCommitteeForm.tsx` · `apps/frontend/src/app/committees/CommitteeRequestForm.tsx` · `apps/frontend/src/app/committees/CommitteeSummaryBlock.tsx` · `apps/frontend/src/app/committees/GenerateCommitteeReportButton.tsx` · `apps/frontend/src/app/committees/CommitteeRosterTable.tsx` · `apps/frontend/src/app/committees/_prototype/CommitteesPrototype.tsx` · `apps/frontend/src/app/api/fetchCommitteeList/route.ts` · `apps/frontend/src/app/api/user/jurisdictions/route.ts` · `apps/frontend/src/app/api/committee/designationWeight/route.ts` · `apps/frontend/src/app/api/admin/loadAdmin/route.ts` · `apps/frontend/src/app/api/admin/scripts/specialVoterFile/route.ts` · `apps/frontend/src/app/api/admin/bulkLoadData/route.ts` · `apps/frontend/src/app/api/admin/bulkLoadData/bulkLoadUtils.ts` · `apps/report-server/components/DesignatingPetition.tsx` · `apps/frontend/src/app/admin/colors/page.tsx`
**Evidence.** E1-1, E1-2, E1-3, E1-4, E1-11, A-7, D-1, F-7, C-13, G-12, H1-13, H1-14, EEH-N4, EEH-N6. The deletion budget is in Direct answer (a). Notes on individual items:
- `loadAdmin` hard-codes two personal email addresses. It has no caller, and its promotion is undone at the next sign-in.
- `bulkLoadData` is a slower fork of the voter-import package. It returns 503 on Vercel, and its error path logs the full voter record.
- Prod's page still runs the full-term `committeeList.findMany` for an Admin and throws the result away (E1-3).
**Why it matters.** Three Leader-callable endpoints exist only for dead UI, and one of them leaks contact info (E13). Every other cross-cutting change (Finding 1, Finding 5, labels, glossary renames) has to touch these files too.
**Proposal.** Follow the verifier's safe order:
- **Step 0, now:** delete `_prototype/`, `loadAdmin`, `specialVoterFile`, `fetchCommitteeList` and `user/jurisdictions`. Delete `designationWeight` after a one-line owner check.
- **Step 1:** move `CommitteeSeatTable` and `formatRollupWeight` into the workspace roster tab folder, and `ContactInfoLabel` and `EligibilitySnapshotPanel` into the workspace drawer folder.
- **Step 2:** delete the legacy components, the flag branch and their tests.
- **Step 3:** delete the roster `includeRows=true` branch.
- **Step 4:** clean up the flag lines in `.env.example` and the docs.

Keep `buildSeatRosterRows` (the detail route imports it), `committeeRead.ts`, `updateLtedWeight` and `admin/petition-outcomes`. **First step:** step 0 as one PR. **Size:** S for step 0, S-M for the rest. Split ticket 16 so step 0 isn't blocked by ticket 15.

### 7. The roster import fuses plan and apply with Prisma, and the import lane uses four bulk-write techniques
**Severity: Medium · Blast radius: medium · Axis: re-architecture / performance / stability**
**What & where.** `apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts` · `apps/frontend/src/app/api/admin/bulkLoadCommittees/route.ts` · `apps/frontend/src/app/api/admin/weightedTable/import/route.ts` · `apps/frontend/src/app/api/admin/crosswalk/import/route.ts` · `packages/voter-import-processor/src/voterRecordProcessor.ts` · `apps/frontend/src/app/admin/discrepancies/CommitteeUploadDiscrepancies.tsx`
**Evidence.** D-4, D-5, D-7, D-9, D-11, D-12, D-13, D-3.
- The plan phase is N+1: one `voterRecord.findUnique` per roster row, plus a query per committee, and an apply re-runs the whole plan.
- `applyRosterImport` is a 375-line closure carrying move bookkeeping and a retry loop.
- Each per-committee transaction gets the 5 s default timeout. A mid-apply failure returns a generic 500, and `persistDiscrepancies` is skipped.
- The weighted-table import drops bad rows silently and keeps a ~55-line dead `ltedMatrix` branch. It also uses `"fallback"` town lookup where the crosswalk uses `"strict"`.
- Bulk writes come in four styles: interpolated `VALUES`, parameterised `unnest`, `Promise.all` of `updateMany`, and per-row loops.
**Why it matters.** The import is the bulk writer of committee state. Its correctness depends on move/settle machinery that a pre-sequenced plan would make unnecessary (tickets 18 and 19), and it can't be unit-tested without Prisma.
**Proposal.** Three stages behind one interface:
1. `parse`, which already exists and is a good seam.
2. A pure `buildPlan(entries, snapshot)`. One batched `loadSnapshot(term)` supplies the voters, committees, active memberships and config. The plan is an ordered list of steps in which every removal comes before every activation.
3. `applyPlan(plan)` in batches under the existing lock order, with per-committee failures collected into `failedCommittees`. Discrepancies are persisted, scoped to the committees this import touched, in the final transaction.

Add one `bulkUpdateById(tx, table, key, columns)` helper (parameterised `unnest`) for every frontend site. Add a `skippedInvalidRow` count to the weighted-table import, delete `ltedMatrix`, and add `setLtedWeights()` to `seatUtils`. **First step:** decide D-13 (keep the tool local-only, or expose it; exposing it raises the priority). Then write `loadSnapshot(term)` and use it in place of the per-row `findUnique`, which removes the N+1 before any restructuring. **Size:** M. E12 is fixed inside `buildPlan`.

### 8. The 43-column voter schema is mirrored by hand in about eight places
**Severity: Medium · Blast radius: medium · Axis: drift-schema / move-complexity**
**What & where.** `packages/voter-import-processor/src/voterRecordProcessor.ts` · `packages/voter-import-processor/src/parseVoterFile.ts` · `packages/shared-validators/src/constants.ts` · `packages/shared-validators/src/searchQueryUtils.ts` · `apps/frontend/src/app/api/admin/bulkLoadData/bulkLoadUtils.ts` · `apps/frontend/prisma/schema.prisma`
**Evidence.** F-6, D-3, D-1, F-2, CDG-N3.
- `VOTER_RECORD_UPDATE_FIELDS`, `exampleVoterRecord`, the zod schema, `STRING_FIELDS`, the searchable-field enum and the frontend fork each carry their own column list.
- Ingestion is gated by the search-field enum.
- The update SQL is string-built with `$executeRawUnsafe`. Escaping is correct with `standard_conforming_strings=on`, but untyped NULLs fail on integer columns (E7). `Number('x')` emits `NaN` and fails a 5,000-row statement.
- `hasDiscrepancy` is only ever written `false`, yet it shows up as a search field and a UI column that always reads "No".
**Why it matters.** A new BOE column is silently not updated by re-imports. Making a column searchable or unsearchable changes what gets ingested.
**Proposal.** One column manifest in shared-validators (`name → {kind, pgType, searchable, archive, label}`) from which the update list, the fixtures, the zod schema and the search fields are all generated. Add a unit test asserting that the manifest's keys equal `Prisma.VoterRecordScalarFieldEnum`. Switch the update to parameterised `unnest` with the typed arrays from the manifest. Drop `hasDiscrepancy`, or derive it from an open discrepancy row. **First step:** the unit test alone, comparing today's `VOTER_RECORD_UPDATE_FIELDS` plus an explicit exclusion list against `Prisma.VoterRecordScalarFieldEnum`. It catches a new unmirrored column before any manifest exists. **Size:** M. **Order:** together with the E7 fix; delete the `bulkLoadData` fork first (Finding 6).

### 9. Load-bearing invariants live only in app locks or hand-written SQL
**Severity: Medium · Blast radius: medium · Axis: drift-schema / stability**
**What & where.** `apps/frontend/prisma/schema.prisma` · `apps/frontend/src/app/api/admin/terms/[id]/route.ts` · `apps/frontend/src/app/api/lib/seatUtils.ts` · `apps/frontend/src/app/api/lib/seatReconciliation.ts` · `apps/frontend/src/lib/committees/missingCommittees.ts` · `apps/frontend/src/app/api/admin/weightedTable/import/route.ts`
**Evidence.** F-3, H1-3, H2-5, F-13, F-14, F-12, B-5, ABF-N4.
- Present, but only as raw migration SQL that Prisma can't see: 5 partial unique indexes (a final-review grep; the lane counted 6) and 4 CHECKs.
- Absent: one ACTIVE member per seat, and one active term. Twelve raw `FOR UPDATE` or advisory-lock sites carry the seat rule, each written by hand.
- Readers call `findFirst({isActive:true})` with no `orderBy`.
- `Seat.weight` copies `CommitteeList.ltedWeight` and has three writers, one of them raw SQL. Seat reconciliation recomputes weights per committee, sequentially, inside a 30 s transaction (ABF-N4).
- "No leg district" has two encodings: the `-1` sentinel on committees and `NULL` on jurisdictions.
- `CommitteeUploadDiscrepancy` is unique per voter across terms.
**Why it matters.** A squash or rebaseline can lose a raw-SQL constraint without anyone noticing. Any future writer that forgets the lock double-seats a committee, and nothing catches it.
**Proposal.**
- Add the two partial unique indexes from E10.
- Add one `test:pg` case asserting that `pg_indexes` and `pg_constraint` contain every raw-SQL constraint.
- Add a `lockCommittee(tx, id)` helper so the twelve sites make one call.
- Recompute seat weights in a single `UPDATE … FROM`, or drop `Seat.weight`.
- Document both leg-district encodings in `CONTEXT.md`.

**First step:** run the two duplicate-check queries against production (two ACTIVE rows in one seat; more than one active term). The indexes can't be created until both return nothing. **Size:** S. **Order:** before Finding 2, because the backstop makes the extraction safer.

### 10. The audit log doubles as application state, and its coverage policy is implicit
**Severity: Medium · Blast radius: medium · Axis: re-architecture / drift-schema / performance**
**What & where.** `apps/frontend/src/lib/auditLogGuard.ts` · `apps/frontend/src/lib/prisma.ts` · `apps/report-server/src/lib/prisma.ts` · `apps/frontend/src/lib/auditLog.ts` · `apps/frontend/src/app/api/lib/seatUtils.ts` · `apps/frontend/src/lib/committees/petitionedSeatBackfill.ts` · `apps/frontend/src/app/admin/audit/auditUtils.ts` · `apps/frontend/src/app/api/admin/audit/route.ts` · `apps/frontend/src/app/api/admin/audit/users/route.ts`
**Evidence.** F-4, A-9, E2-6, E2-7.
- Immutability is a Prisma `$use` middleware on the frontend client only. `$use` was deprecated in Prisma 4.16 and removed in 6.14.
- `findPreviousSeat` and the petitioned-seat backfill read `afterValue->>'seatNumber'` as state.
- Missing audit actions: invites, role grants, LTED weight edits and crosswalk upserts write none. `REPORT_GENERATED` has no writer, and crosswalk deletes borrow `DISCREPANCY_RESOLVED`.
- Fail-open versus fail-closed is decided per site, by function name plus a comment.
- The users dropdown dedupes `distinct` in memory over every audit row. Neither sort has an `id` tiebreaker.
- `buildSummary` is a 450-line client switch over the write shapes, and the export route imports it from a page folder.
**Why it matters.** The log can't stay purely append-only while seat logic reads it. The guard blocks a Prisma upgrade, and access changes can't be reconstructed from the log.
**Proposal.**
- Replace the guard with a `BEFORE UPDATE OR DELETE` trigger, and drop `$use`.
- Promote what the app reads (a last seat number) into columns.
- Make the audit policy a per-action table in `auditLog.ts`, and add the missing actions.
- Add a `{action → payload}` discriminated union in `lib/audit/`, shared by writers and `buildSummary`.
- Use `user.findMany({where:{auditLogs:{some:{}}}})` for the dropdown, and add `id` to the sorts. Composite indexes wait for EXPLAIN.

**First step:** the trigger migration, then delete the `$use` call and `auditLogGuard.ts`. **Size:** S (trigger, dropdown) to M (state columns, union).

### 11. Package boundaries are blurred
**Severity: Low · Blast radius: medium · Axis: re-architecture / drift-code**
**What & where.** `packages/shared-prisma/src/index.ts` · `packages/shared-validators/src/constants.ts` · `apps/report-server/src/memberContact.ts` · `apps/frontend/src/lib/webhookUtils.ts` · `apps/report-server/src/webhookUtils.ts`
**Evidence.** F-8, F-9, F-10, F-2 (`xlsx-tester`), C-2 (duplicated HMAC helpers).
- shared-prisma's hand-synced re-export list is stale, and 190 frontend files import `@prisma/client` directly. The package also hosts domain logic: eligibility flagging and residency.
- `submissionMetadata` is hand-parsed in four readers, one of them the report-server.
- Webhook signing is copied in both apps.
- The report-server `prestart` builds packages in reverse dependency order. `prisma generate` runs twice. The unused `xlsx-tester` is built on every install.
**Why it matters.** Contributors can't tell which package owns what, and cross-app contracts (metadata JSON, signing) drift.
**Proposal.**
- Make shared-prisma either "domain rules plus enum values" or a real `packages/db`, and delete the re-export list and its sync script.
- Move `submissionMetadataSchema` and the sign/verify helpers into shared-validators.
- Use one topological `pnpm --filter … build` and a single `prisma generate`.
- Remove `xlsx-tester` from `build:packages`.

**First step:** drop `xlsx-tester` from the build, and move the sign/verify helpers as part of E1. **Size:** S-M.

### 12. Route handlers hold domain logic, and the layering points the wrong way
**Severity: Medium · Blast radius: medium · Axis: move-complexity**
**What & where.** `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts` · `apps/frontend/src/app/api/committee/add/route.ts` · `apps/frontend/src/app/api/admin/eligibility-flags/[id]/review/route.ts` · `apps/frontend/src/app/api/lib/utils.ts` · `apps/frontend/src/app/api/admin/audit/export/route.ts`
**Evidence.** A-14.
- The 13 largest routes are each over 250 LOC. `petition-outcomes/record` is 464, and holds transition tables and seat-conflict checks.
- `invites` carries the jurisdiction dedupe rules and a sequential existence-check loop.
- `api/lib/utils.ts` imports a type from a route folder.
- The audit export route imports from `app/admin/audit`.
- `api/lib/utils.ts` is a grab-bag.
**Why it matters.** Logic inside handlers can only be tested through HTTP mocks, and it gets copied between sibling routes (Finding 2).
**Proposal.** Add `api/lib/services/*` modules that take `(tx, actor, input)` and return discriminated results. Start with petition outcomes (it is also E10's fix site) and invites. Move the shared types and `buildSummary` into `lib/`, and split `api/lib/utils.ts` by concern. **First step:** extract the petition-outcomes recorder into a service in the same change that fixes E10. **Size:** L, done incrementally. **Order:** the rest after Finding 1, whose wrappers do the HTTP mapping.

### 13. The client fetch layer exists but is half adopted
**Severity: Medium · Blast radius: large · Axis: drift-code / simplification**
**What & where.** `apps/frontend/src/hooks/useApiQuery.ts` · `apps/frontend/src/hooks/useApiMutation.ts` · `apps/frontend/src/app/committees/workspace/useCommitteeGridData.ts` · `apps/frontend/src/app/committees/workspace/adapters.ts` · `apps/frontend/src/app/recordsearch/RecordsList.tsx` · `apps/frontend/src/app/admin/eligibility-flags/EligibilityFlagsTable.tsx`
**Evidence.** E1-6, E2-1, E2-10, A-3 (client half), EEH-N3 (E18), EEH-N2 (E17).
- `useApiQuery` is used in 6 files, and no workspace file is among them. Seven workspace sites hand-roll `AbortController` and the error parsing.
- About 23 files call `fetch` directly.
- `useApiMutation` throws only a plain `Error`, so the governance 422 field-errors path can't use it. It shares one `loading` state per hook instance, and it rethrows after `onError`.
**Why it matters.** Every screen handles stale responses, errors and loading its own way, which is how the record-search defects (E17) and the Sentry noise (E18) happen.
**Proposal.** Keep the in-house pair and don't adopt react-query for this many call sites. Extend `useApiQuery` with `query` params and an `ApiError` that carries `status` and the parsed body. Give `useApiMutation` per-key pending state and no rethrow. Add a `fetchJson(url, schema, signal)` helper for the workspace hooks, and migrate the 8 admin raw GETs. **First step:** remove the rethrow in `useApiMutation` (the sentry-setup ticket 04) and add `ApiError`. **Size:** M.

### 14. Admin CRUD scaffolding, label maps and date helpers are duplicated
**Severity: Low · Blast radius: medium · Axis: simplification / drift-code**
**What & where.** `apps/frontend/src/app/admin/election-config/ElectionDates.tsx` · `apps/frontend/src/app/admin/election-config/ElectionOffices.tsx` · `apps/frontend/src/app/admin/users/UsersClient.tsx` · `apps/frontend/src/app/admin/users/InviteManagement.tsx` · `apps/frontend/src/lib/dateUtils.ts` · `apps/frontend/src/lib/electionDateUtils.ts` · `apps/frontend/src/lib/getAdminPageAccess.ts` · `apps/frontend/src/app/admin/discrepancies/CommitteeUploadDiscrepancies.tsx`
**Evidence.** E2-2, E2-3, E2-4, E2-5, E2-8, E2-9, D-10.
- The Dates and Offices panels are ~560 LOC of near-copies.
- 13 admin pages repeat the gate-plus-shell block. That repetition is correct, because `AuthCheck` is client-side.
- `formatElectionDateForForm` is identical to `formatCalendarDateForForm`, and five `toLocaleDateString()` calls bypass both modules.
- `REASON_LABELS` is duplicated. Meeting-type labels are defined three ways.
- The users and invites screens duplicate the jurisdiction-picker logic.
- `confirm()` sits alongside `AlertDialog`.
- The discrepancy label keys have drifted from the server's (E18).
**Why it matters.** Small, but it is where UI inconsistency and blank labels come from.
**Proposal.**
- A `useListConfigPanel<T>` hook plus one `ConfigListPanel` component.
- A `withAdminPage` helper that keeps the per-page actual-privilege check.
- Fold `electionDateUtils` into `dateUtils`, with a lint rule on `toLocaleDateString`.
- `Record<Enum, string>` label modules in `lib/labels/`, and `DISCREPANCY_LABELS` keyed next to the server's field list.
- A shared `JurisdictionPicker` and a `useConfirmDialog()`.

**First step:** fix the blank discrepancy labels (D-10) by exporting the key list from the server module and keying the labels on it. **Size:** S-M each.

### 15. The committees workspace re-drains the whole scope per page and per mutation
**Severity: Low · Blast radius: medium · Axis: performance / re-architecture**
**What & where.** `apps/frontend/src/app/api/committee/roster/route.ts` · `apps/frontend/src/app/committees/workspace/useCommitteeGridData.ts` · `apps/frontend/src/app/committees/workspace/useGridRefresh.ts` · `apps/frontend/src/app/committees/workspace/CommitteeWorkspace.tsx` · `apps/frontend/src/app/committees/page.tsx`
**Evidence.** A-12, E1-5, E1-3, E1-7.
- Every roster page request recomputes the rollups for the whole scope, then slices the page in memory.
- The client drains every page at 500 per request.
- Every mutation reloads the detail, re-drains the grid and re-runs the member search.
- The server page queries data the live path doesn't use.
- `CommitteeWorkspace.tsx` (445 LOC) orchestrates about 10 hooks and two focus state machines.
**Why it matters.** Cost grows as O(N²/500) with the number of committees, and the pagination is cosmetic. Fine at today's county size, but it is wasted work.
**Proposal.** With `includeRows=false`, return all rollups in one response. After a mutation, patch one row from `detail.rollup`. Derive the initial scope from the roster response, which also removes the page's in-memory duplicate of the jurisdiction rule. Extract `useWorkspaceSelection` and `useDrawerSession` when tickets 23, 27 or 29 touch the file. **First step:** the one-response rollup for `includeRows=false`. **Size:** S-M. **Order:** after Finding 6, which removes the rows mode.

### 16. Query shapes have outgrown the indexes and orderings behind them
**Severity: Medium · Blast radius: medium · Axis: performance / drift-schema**
**What & where.** `apps/frontend/src/app/api/fetchFilteredData/route.ts` · `apps/frontend/src/app/api/committee/memberSearch/route.ts` · `apps/frontend/prisma/schema.prisma` · `apps/report-server/src/committeeMappingHelpers.ts` · `apps/frontend/src/app/api/reports/route.ts` · `apps/frontend/src/app/api/admin/audit/route.ts`
**Evidence.** F-1 (partial, medium), EEH-N1, C-8, A-10 (partial), E2-6.
- `VoterRecord` has only its primary key.
- Record search sorts by `(firstName, lastName)` with `OFFSET` and then runs a full `count` serially.
- `fetchChangesData` and `fetchPetitionOutcomesData` read the whole term countywide, with full voter rows, then filter scope in JS. The `where` they build is never passed to Prisma.
- `GET /api/reports` makes one `HeadObject` call per row, allows a page size up to 100, and returns other users' emails on public reports.
**Why it matters.** Latency, not correctness. The exception is the missing tiebreaker, which is E17.
**Proposal.**
- Add `(firstName, lastName)`. The lane's `(lastName, firstName)` doesn't serve this sort; the verifier corrected it.
- Add `(city)` and `(electionDistrict)` only after EXPLAIN on production-sized data, and run `count` in `Promise.all` or cap it.
- `memberSearch` is driven from memberships and probably needs no trigram index.
- Push the scope and a 3-field `select` into the report-server queries.
- Persist `fileSize` on `Report` at completion and presign lazily.
- Add `id` tiebreakers wherever `skip` paging is used.

**First step:** the `VRCNUM` tiebreaker (E17), then one EXPLAIN of the record search on production-sized data before adding any index. **Size:** S each.

### 17. The report-server process runtime has no budget or lifecycle
**Severity: Medium · Blast radius: medium · Axis: stability / performance**
**What & where.** `apps/report-server/src/index.ts` · `apps/report-server/src/utils.ts` · `apps/report-server/src/utils/xlsxUtils.ts` · `apps/report-server/src/lib/prisma.ts` · `apps/report-server/ecosystem.config.js`
**Evidence.** C-10 (structural half; the defect is E6), G-11, G-2, H2-6 (Sentry).
- Each PDF launches its own Chrome with `--single-process`, and PDFs load Tailwind over loopback.
- XLSX files are built fully in memory.
- There is no `/health`, no SIGTERM handler, and no Sentry. The Prisma client is created on import.
**Why it matters.** Memory pressure, restarts and silent failures are the main operational risk on a 1 GB box, and none of them is observable today.
**Proposal.**
- Separate `heavy` and `pdf` semaphores.
- Inline the CSS and use `waitUntil: 'load'`.
- Optionally run one long-lived browser that restarts on disconnect.
- Stream XLSX output.
- Add `/health`, a SIGTERM handler that stops claiming jobs and drains, and Sentry initialisation.

These complement Finding 3 (durable queue) and tickets 09, 12, 24 and 27. **First step:** the two semaphores (E6) and a `/health` route. **Size:** S-M.

### 18. Provisioning is eight sourced shell scripts running on the box
**Severity: Medium · Blast radius: medium · Axis: simplification / stability**
**What & where.** `main.tf` · `infrastructure/scripts/00-setup-all.sh` · `infrastructure/scripts/02-setup-project.sh` · `infrastructure/scripts/06-setup-pm2.sh` · `infrastructure/scripts/07-start-services.sh` · `infrastructure/configs/nginx-report-server.conf` · `scripts/deploy-lightsail.sh` · `apps/report-server/start.sh` · `.github/workflows/test.yml`
**Evidence.** G-2, G-3 (partial), G-4 (partial; live state unverified), G-6, G-7 (partial), G-8 (partial), G-12, G-14.
- The scripts plus Terraform `user_data` come to about 973 LOC. About half of 01, 03, 06 and 07 is root-versus-SSH-user branching.
- Deploys have guaranteed downtime and no rollback for dependencies.
- `pm2 startup` is only echoed; reboot is untested (ticket 17).
- `git reset --hard` runs on re-provision.
- The inline nginx heredoc in 07 drops the security headers.
- CI runs on `pull_request` only, with no report-server build or tsc, no shellcheck and no `terraform validate`.
- Two start paths exist (`apps/report-server/start.sh` with ts-node, and `dist`).
**Why it matters.** Recreating or rebooting the box is the riskiest operation, and nothing exercises it.
**Proposal.** This is already planned: build the bundle off the box (ticket 14), use a systemd unit with blue/green or socket handoff (ticket 26), and use headless-shell Chrome (ticket 12). Until then:
- delete `start.sh` and the ts-node `start`;
- fix the 07 nginx block;
- add report-server tsc, shellcheck and `terraform validate` to CI, with a `push` trigger on main.

**First step:** delete the ts-node start path and add the report-server `tsc` step to CI. **Size:** S for the stopgaps; the tickets cover the rest. Don't open a new strategic item.

### 19. Configuration is unvalidated on both apps
**Severity: Medium · Blast radius: medium · Axis: stability / drift-code**
**What & where.** `apps/frontend/src/env.js` · `apps/frontend/src/app/api/generateReport/route.ts` · `apps/report-server/src/index.ts` · `apps/frontend/prisma/schema.prisma` · `apps/frontend/sentry.server.config.ts`
**Evidence.** F-11, H2-6, G-11, ABF-N5.
- `env.js` validates 4 of about 20 variables, and only at build time.
- `PDF_SERVER_URL` and the worker's `CALLBACK_URL` fall back to localhost in production. Terraform's default is localhost too.
- `db_migrate` (`migrate dev`) is the only migration script.
- The datasource has no `directUrl`, so migrations and long transactions run through the pooled URL.
- No `transactionOptions` are set, so every interactive transaction defaults to 5 s. That default is the root of E5 and D-7.
- `tracesSampleRate: 1` in production.
**Why it matters.** A missing variable fails silently at runtime: callbacks go to localhost, or reports stay stuck.
**Proposal.**
- Extend `createEnv` to every variable read, and make them required when `NODE_ENV=production`. Import the schema in `instrumentation.ts` so boot fails fast. Add a matching zod schema at worker boot.
- Add a `db_deploy` script (`prisma migrate deploy`) and `directUrl`.
- Set explicit timeouts on bulk transactions, or a global `transactionOptions`.
- Drive the Sentry sample rate from the environment.

**First step:** a zod env schema at worker boot that requires `WEBHOOK_SECRET` and `CALLBACK_URL`; it lands with E1. **Size:** S. Related: `.scratch/config-and-secrets/issues/05-report-server-runtime-config.md` and `06-vercel-frontend-config.md` (untracked, open).

### 20. Docs have drifted, and stale docs crowd out the live ones
**Severity: Medium · Blast radius: medium · Axis: drift-docs**
**What & where.** `apps/report-server/AI_README.md` · `CLAUDE.md` · `AGENTS.md` · `CONTEXT.md` · `skills/adding-reports/SKILL.md` · `skills/auth-check-patterns/SKILL.md` · `docs/SHARED_PRISMA_ARCHITECTURE.md` · `docs/LOCAL_DEVELOPMENT.md` · `docs/adr/0001-committee-residency-by-assembly-district.md` · `infrastructure/ARCHITECTURE_DECISION.md` · `infrastructure/DEPLOYMENT_SETUP.md`
**Evidence.** H1-1, H1-2 (partial), H1-3, H1-4, H1-5, H1-6, H1-7, H1-9..H1-12, H1-15 (partial), G-5.
- `apps/report-server/AI_README.md` describes a synchronous petition-only service that "returns the PDF". It is the agent entry point for that app.
- `CLAUDE.md` lacks the test-type-safety pointer and the illegible-bug checklist that `AGENTS.md` has.
- `adding-reports` points to a non-existent `scopeReportHandlers/`.
- The glossary claims a single active term. SRS 6.2 lists statuses that aren't the as-built ones.
- `SHARED_PRISMA_ARCHITECTURE.md` claims `pnpm dev` auto-rebuilds. Node is documented as 22 against `engines: 24.x`.
- The infra ADR predates swap, pinned pnpm and the re-exec.
- About 20 stale docs (CODEBASE_AUDIT notes, branch reviews, scenario gaps, July reviews) sit beside the live ones.
**Why it matters.** Agents and new contributors follow these docs, and the docs describe the old system.
**Proposal.**
- Rewrite `apps/report-server/AI_README.md`.
- Make `CLAUDE.md` an `@AGENTS.md` import.
- Make one-line fixes to the skills, ADR 0001, SRS 6.2, the shared-prisma doc and the local-dev doc.
- Archive per the verifier's corrected list. Keep `docs/SCHEMA_IMPROVEMENTS.md` and `docs/BRANCH_ARCHITECTURE_REVIEW.md`, because live skills and plans link to them, or update those links. Move BUG-002 out of `docs/BUGS.md` into `.scratch` first. Archive the `SRS/PHASE1_*` docs only together with a README edit.
- Open tickets for the ~15 still-open July findings before archiving the July reviews.

**First step:** the `AI_README.md` rewrite, since agents read it first for that app. **Size:** S each.

### 21. The upload and storage lifecycle has no owner
**Severity: Medium · Blast radius: small · Axis: simplification / stability (PII retention)**
**What & where.** `apps/frontend/src/lib/s3Utils.ts` · `apps/frontend/src/app/api/getCsvUploadUrl/route.ts` · `apps/frontend/src/app/api/getVoterFileUploadUrl/route.ts` · `apps/frontend/src/app/api/committee/resignation-letter/upload-url/route.ts` · `apps/frontend/src/app/api/reports/[id]/route.ts` · `apps/report-server/src/s3Utils.ts`
**Evidence.** A-13, C-11, H2-8.
- There are three presign routes, two of them near-duplicates. Only the resignation-letter route signs `Content-Length`, so the 50 MB and 500 MB limits are advisory.
- `deleteObject` exists but only resignation letters use it. Soft-deleting a report leaves its file (voter PII included), and uploads are never removed.
- Object keys embed the author's display name. No lifecycle policy is defined in the repo.
**Why it matters.** Personal data lives in R2 indefinitely, and the upload limits aren't enforced.
**Proposal.**
- One `issueUploadUrl({prefix, ext, types, maxBytes})` built on the sized presign. It also gives E2's key binding a place to live.
- Delete the object on soft-delete and after a successful import.
- Add R2 lifecycle rules per prefix, like the existing staging rule for letters.
- Optionally key objects by `jobId`.

**First step:** the key-prefix check from E2, then delete the object when a report is soft-deleted. **Size:** S.

## Sequenced roadmap

**Now (this week).** All S. The first five rows are the High escalations that have an S-sized fix or stopgap; each row also unblocks or de-risks a later item.

| Item | Unblocks |
|---|---|
| E1: sign the Buffer (frontend first), verify before gunzip, `maxOutputLength`, require the secret, then close 8080 | Finding 3 (same handler), Finding 4 |
| E2: `REPORT_MIN_PRIVILEGE` table and the `fileKey` prefix check | Finding 5, Finding 21 |
| E3 stopgap: written manual revoke procedure; `signIn` catch fails closed | E3 proper (Next) |
| E4: B-1 re-read and conditional writes | Finding 2 |
| E6: heavy/PDF semaphores (also single-flights `voterImport`, E7 part 4) | Finding 17 |
| E5: one transaction per decision, `.max(200)`, plus a `test:pg` case. Do it before the next reorganization meeting | Finding 2 |
| E9: petition outcomes dedupe | — |
| E17 (partial): `VRCNUM` tiebreaker and parallel `count` | Finding 16 |
| Finding 6 step 0: delete `_prototype/`, `loadAdmin`, `specialVoterFile`, `fetchCommitteeList`, `user/jurisdictions` (closes E13) | Finding 1 (fewer routes), Finding 5 |
| Finding 1 day-one: Sentry in `withBackendCheck`; `check:api-routes` in CI | Finding 1 migration |

**Next (the following 2–4 weeks).**
1. E3 proper: the disable column or `NoAccess` level, the Admin revoke action, and the choice of a single grant table (Finding 5).
2. E8 plus Finding 3's transition module: conditional writes, failure reason, callback retry and timeout, and a stale-row sweep.
3. Finding 9's partial unique indexes and constraint test (each preceded by a duplicate check), then E10 and E11 in place.
4. E7, voter-import validate-then-apply, together with Finding 8's column manifest and the `unnest` rewrite.
5. Finding 6 steps 1–4 (ticket 16, once 15 is done). Then start Finding 1's per-route migration on what remains.
6. Finding 19 env schemas, `db_deploy`, `directUrl`.
7. E14 Ably capability, E15 read audit, Finding 21 delete/expire.
8. Finding 20 doc fixes. Open tickets for the July open items.

**Later.**
- Finding 2, the `membershipTransitions` extraction.
- Finding 4, the handler map and derived enriched schema, alongside Finding 3's durable queue (ticket 25).
- Finding 7, the roster import split, once D-13 is decided.
- Finding 10, the trigger, state columns and payload union.
- Findings 11 to 15 (packages, services, client fetch layer, admin CRUD, workspace data flow), opportunistically as files are touched.
- Finding 18 via tickets 14, 15 and 26.
- The Finding 20 archive pass.

**Key ordering constraints.**
- Delete the legacy UI and its routes before the route-wrapper migration and the authz consolidation, so dead code isn't migrated.
- Fix E4, E5, E10 and E11 in place and add Finding 9's DB backstops before extracting `membershipTransitions`.
- Deploy the frontend half of E1 (sign the Buffer) before the worker half (verify), and confirm `PDF_SERVER_URL` uses nginx before closing 8080.
- Land E1 before the dispatch and queue refactors of `apps/report-server/src/index.ts`.
- Land conditional status writes (Finding 3's transition module) before the durable queue.
- Run the duplicate checks before creating either partial unique index.
- Replace the audit `$use` guard with a trigger before upgrading Prisma to 6.14 or later.
- Ticket the July open items before archiving the July reviews.

## Backlog-only notes

| # | Note | IDs |
|---|---|---|
| B1 | Glossary drift in route names (`requestAdd`, `handleRequest`, `remove`); add Replacement, Eligibility Flag and Direct Exit entries; rename opportunistically | B-10, H1-13 |
| B2 | Small dead helpers: `assignNextAvailableSeat`, exported single-use `getRemoveMemberIdFromMetadata`, duplicated P2002 sniffing, report-server `sleep`, dead `ReportMetadataMap` types | B-11, C-13 |
| B3 | `SHOW_MEMBERSHIP_TYPE = false` branches; resolve with leader-petition-visibility | E1-10 |
| B4 | `/committees/requests` duplicates the Pending tab; tracked in `.scratch/committees-workspace/issues/22-requests-page-into-workspace.md` | E1-12 |
| B5 | Workspace bundle posture (client-only, lazy drawer); UNVERIFIED, no build measured | E1-13 |
| B6 | `CommitteeWorkspace.tsx` and `adapters.ts` hotspots; split only alongside tickets 23, 27 or 29 | E1-7 |
| B7 | Sidebar eager prefetch is deliberate; the `enabled` nav flag is vestigial | E2-11 |
| B8 | Two encodings for "no leg district"; document now, model a `scope` enum later | F-14 |
| B9 | `CommitteeUploadDiscrepancy` keyed per voter across terms; soft-pointer columns without FKs; reopen overwrites history | F-12 |
| B10 | `Seat.weight` denormalisation; drop it or derive it (see Finding 9) | F-13 |
| B11 | `apps/frontend/next.config.ts` `output: "standalone"`, `i18n` and unguarded PostHog rewrites; cleanup only | G-13 |
| B12 | Chrome apt package list partly obsolete; fold into ticket 12 | G-14 |
| B13 | nginx: three near-duplicate configs, deprecated directives, no `client_max_body_size` (a 413 is theoretical) | G-8 |
| B14 | `ldCommittees` legacy report and `ScopedReportForm` switch; decide whether to fold into `committeeRoster` xlsx | C-14 |
| B15 | Scope `where` and title duplication in the worker; do with Finding 4 | C-9 |
| B16 | SRS traceability matrix cites missing files; relabel as a dated snapshot rather than regenerate | H1-9, H1-10 |
| B17 | Weighted-table and crosswalk import town lookup modes differ (`fallback` vs `strict`) | D-11 |

## Already good

- **Exit side of the membership lifecycle.** `apps/frontend/src/app/api/lib/membershipExit.ts` uses conditional writes with lock-and-reread, CHECK backstops, a typed `changed` result and letter fields cleared by default. ADR 0002 matches it exactly and is the template for Finding 2.
- **Single seat writer.** `activateMembershipInSeat` is used by add, confirm, discrepancy and bulk load. Seat selection, including petitioned-seat return, lives in one place.
- **Roster import lock discipline.** It locks committees in id order, converts the per-term unique-index conflict into a typed error and rolls back instead of continuing in an aborted transaction, and writes audit rows in the same transaction. The parser seam (`RosterFormat` registry with `satisfies`) is clean.
- **Shared report contract.** `generateReportSchema`, `enrichedReportDataSchema` and the callback payload schema live in shared-validators and are parsed on both ends, with compile-time exhaustiveness guards. `REPORT_TYPE_MAPPINGS` derives from the registry. `docs/SRS/REPORT_PARAMETER_MATRIX.md` matches the code.
- **Inbound callback verification.** `apps/frontend/src/app/api/reportComplete/reportCompleteVerifier.ts` does a constant-time, format-checked HMAC over the exact text it receives, and the worker signs exactly the string it sends.
- **Trust-boundary wrappers.** `withPrivilege`, `withPublic` and `withBackendCheck`, checked by `pnpm check:api-routes`, cover all 79 methods. There are no server actions or middleware to drift. Actual-versus-acting privilege is respected server-side.
- **Crosswalk and weighted-table imports.** One read, an in-memory diff, a parameterised typed `unnest` update and explicit 30 s timeouts. They are the model for Finding 7.
- **Client primitives.** `apps/frontend/src/hooks/useApiQuery.ts` (abort, timeout and error-body parsing) and `apps/frontend/src/lib/dateUtils.ts` (calendar day versus instant) are the right designs. The findings are about adoption.
- **Workspace model modules.** `gridModel`, `historyModel`, `rowActions` and `seatPetitionDisplay` are small and pure. The URL is the single source of truth, and the client never re-implements residency or eligibility.
- **Existing DB constraints.** One ACTIVE membership per voter per term, the exit-report and letter CHECKs, the governance singleton and the Seat unique are all in place.
- **Report-server operations details.** `apps/report-server/build.sh` swaps builds atomically with a restore, the PM2 limits are tied to measured numbers, the swap setup is re-run safe, and the PDF-validation harness is well isolated (fresh workers, frozen clock, no DB, pinned image).

## Not a finding

- **Acting-as-Leader report form showing "no committee"** for a Developer or Admin is intentional.
- **G-13 `release.create: isCi` broken: REFUTED.** Sentry has a release for every recent main commit, including `dcedbdcc`, so source-map upload works on Vercel.
- **C-4 "callback can regress COMPLETED to PROCESSING": REFUTED.** The callback never writes COMPLETED to a PENDING row. The only outcome is a stuck PROCESSING row (E8).
- **D-6 "a committee whose only row was rejected is wiped": REFUTED.** Removals are computed only for committees with at least one valid entry. The narrower case stands (E12).
- **D-2 "re-running the same file doesn't converge": REFUTED.** The same file converges. Only a *corrected* file under the same year and entry fails to apply (E7).
- **G-1 "unset secret means silently accepted unsigned callbacks": REFUTED.** Unsigned callbacks are rejected with 401. The effect is stuck rows (availability), not forgery.
- **A-10 "two S3 network calls per row": corrected to one.** Presigning is local HMAC; only `HeadObject` goes over the network.
- **F-1 index `(lastName, firstName)`: corrected.** It doesn't serve `ORDER BY firstName, lastName`. memberSearch is membership-driven and doesn't automatically need trigram indexes.
- **F-4 "`$use` removed in Prisma 6.0": corrected to 6.14.** Also, "the report-server bypasses the guard" is theoretical today, since that client only creates rows.
- **E1-4 "possibly delete `buildSeatRosterRows`": wrong.** The detail route imports it, so it stays. `apps/frontend/src/types/reportMetadata.ts` is likewise live: `ReportCard` uses `isVoterImportMetadata`.
- **E1-9 jurisdiction helpers "drift":** `committeeMatchesJurisdictions` and `buildJurisdictionWhere` are documented counterparts that agree on a null LD. What remains is call-site count (Finding 5), not divergence.
- **E2-4 hydration risk in `EligibilityFlagsTable`: overstated.** Its data is fetched on the client and never appears in server HTML.
- **H2-3 Leader PII leak as High: lowered to Medium.** Only a dead-UI endpoint exposes it, scoped to the Leader's jurisdiction. Deleting it is the fix (E13).
- **G-3 `chown -R` of the SSH user's home:** harmless. The user owns their own home.
- **G-8 nginx 1 MB body limit versus Express 2 MB:** theoretical. Real gzipped job bodies are KB-sized.
- **Rejected abstractions.** Adopting react-query for 7 + 32 call sites (E2-1): the in-house hooks need completing, not replacing. A server-sent `capabilities` block (E1-8): more than needed while every action is re-checked on the server. Dropping zod parsing of the server's own responses for bundle size (E1-13): it guards against client/server skew. Collapsing the per-page `getAdminPageAccess` into the layout (E2-3): `AuthCheck` is client-side, so the per-page call is the only server gate.
- **RequestAccess unscoped on requestAdd, exitReport and the letter upload:** an accepted decision in `.scratch/committees-workspace/issues/03-requestaccess-submission-role.md`.
- **`?? PrivilegeLevel.Admin` fallbacks:** unreachable behind gated `withPrivilege`. They are drift (Finding 5), not a live privilege bug.
- **NextAuth handler re-export without a wrapper:** the expected exception.

## Coverage & limits

- **Read in full:** the wrappers and validation helper; `auth.ts`; the generate, complete, token, reports and fetchFilteredData routes; `membershipExit`, `membershipConfirmation` and `seatUtils`; the add, requestAdd, remove, exitReport and handleRequest routes; the report-server `index.ts`, `jobOrchestration.ts` and webhook/S3 utils; the shared report schemas and registry; `bulkLoadCommittees` (route and 1,464-line utils), `bulkLoadData`, the discrepancy and undo routes, the crosswalk and weighted-table imports, and the voter-import package; the workspace core and hooks; the date helpers and the audit routes; `env.js`; all infrastructure scripts, configs and the CI workflow; `CONTEXT.md`, both ADRs, the auth and reports skills, the July review synthesis, and `apps/report-server/AI_README.md`.
- **Read in part:** the decisions, petition-outcomes, governance-config, detail and roster routes; `committeeMappingHelpers.ts` and the worker `utils.ts`; `ScopedReportForm`; the admin panels; the schema and migrations (grepped for every index, CHECK, unique and `isActive`); about 40 docs (heads only for archive triage); the PDF-validation harness (README plus LOC).
- **Not opened:** absentee processor internals, the PDF layout components, most legacy committee component bodies (judged by importers and LOC), `docs/UI_ARCHITECTURE_REVIEW/`, the AUTH_INVITE and AUDIT_TRAIL plans, and the bodies of six July review vectors (re-verified through the synthesis's evidence instead).
- **No database access.** Index and performance claims are inferred from query shapes and the schema, without EXPLAIN. The Ably key's capability and the live firewall state were not checked.
- **Nothing was executed.** No build or bundle was measured, so E1-13 is UNVERIFIED. No race was reproduced. The B-3 claim that the last-item P2002 leads to a COMMIT that rolls back and a 200 response is reasoned from Postgres semantics, not tested, and needs one `test:pg` case. F-6's NULL-typing failure is reasoned the same way.
- **Unverified items:** F-14 (not re-read by a verifier), E1-13 and G-4's live reboot state (ticket 17).

## Format notes (hybrid vs methodology)

This run deliberately departs from the architecture methodology in five ways, at the requester's direction:
1. It includes proposals, sizes and a roadmap. The base methodology says "findings register only, no remediation".
2. Escalations carry a severity and a fix. The methodology wants one line, no severity.
3. The run has 21 findings plus 17 backlog notes. The methodology caps the combined count at 8–20.
4. Infrastructure is in scope.
5. Infrastructure and config files are cited by their full repo-relative path. The scope gate's manifest holds product files only, so `pnpm review:gate` reports those citations as out of manifest (the list is in Final review). That is a limit of the tooling, accepted here because a correct path matters more than a passing gate. The gate does not check paths outside `apps/`, `packages/` and `scripts/`.

## Final review

Final reviewer: Fable (`claude-fable-5-2`), 2026-11-21, against the same worktree at `dcedbdcc`. Code was re-read; nothing was executed.

**Verified against code (confirmed as written unless noted):**
- **E1.** The frontend signs the UTF-8 encoding of a latin1 decode of the gzip bytes; `/start-job` never reads the signature header; `gunzipSync` has no output limit; `main.tf` opens 8080.
- **E2.** `generateReport` is gated at RequestAccess, `voterImport` is in the public schema, and no code checks the `fileKey` prefix. The staging-upload chain is new (see below).
- **E3.** `signIn` returns `true` for every existing user, and the catch fails open. No route or page writes or deletes `PrivilegedUser`, deletes sessions or disables a user.
- **E4.** The SUBMITTED check precedes the lock and both writes are unconditional. No CHECK constraint stops a REJECTED row from keeping a seat number.
- **E5.** The catch-and-continue inside the interactive transaction, the missing `.max()` and the default timeout are all there. Severity changed (see below).
- **E6, E7.** `QUEUE_CONCURRENCY = 2` against a 384 MB heap; strict `>` in `isRecordNewer`; untyped `NULL` in the string-built `VALUES` list; a module-level dropdown accumulator; archive and update writes with no transaction.
- **Findings 1–3.** Route counts were recounted. The success callback shares a `try` with the job, and the callback route skips any row that isn't PROCESSING.
- **Medium spot checks.** E9 (double listing; the scope `where` is built and never used), E10, E11, E13, E14 (token request has no capability), A-4 (`=== Admin` in `requestAdd`), and Finding 16 (`VoterRecord` has no secondary index in the schema or in raw migration SQL).
- **Deletion budget.** `wc -l` gives 3,304 (prototype, 7 files), 851 (dead routes, 7 files) and 312 for three of the small items. The five whole legacy files are 2,291 lines; the rest of that row is an estimate for the partial edits. The total of about 7,000 holds.

**Changed:**
- E5 lowered from High to Medium, with the reason in the row. The escalation counts are now 6 High, 11 Medium, 1 Low.
- E2 gained one item, marked "added in final review": the missing key-prefix check and the staging-upload route to a caller-written import file. The fix now includes the prefix check.
- E1's fix is now an ordered deploy (frontend signs first, worker verifies second, close 8080 last). The memory wording and the name of the schema were corrected.
- E3 now says that a hand-removed grant takes effect only at the next sign-in, and it has a same-day stopgap, which was added to the Now list.
- Counts corrected: 51 of 63 catching route files never call Sentry (the doc had "58 … only"); 23 fallbacks; 5 partial unique indexes; `useApiQuery` in 6 files.
- Every finding now has a "First step". The roadmap's Later list no longer repeats the ordering constraints, and the constraints list gained the E1 deploy order and the duplicate checks.
- Full repo-relative paths restored for infrastructure and config files. `docs/SRS/REPORT_PARAMETER_MATRIX.md` had the wrong directory.
- A "Bottom line" paragraph was added at the top of Direct answers.

**Scope gate.** `pnpm review:gate` fails, and only on six cited paths that are outside the product manifest: `apps/frontend/sentry.server.config.ts`, `apps/report-server/AI_README.md`, `apps/report-server/build.sh`, `apps/report-server/ecosystem.config.js`, `apps/report-server/pdf-validation/src/callShapes.ts` and `apps/report-server/start.sh`. All six exist at `dcedbdcc`. There are no malformed, bare or test-path citations. See Format note 5.

**Residual uncertainty:**
- No race, timeout or import failure was reproduced. E4, E10 and E11 are read from code. E5's false-success case and E7's NULL-typing failure are reasoned from Postgres behaviour. E5's "exceeds 5 s" is an estimate from the query count.
- The E2 staging-upload chain assumes that the worker reads from the bucket the frontend writes to. Both use `R2_BUCKET_NAME`; the deployed values were not checked.
- Whether `PDF_SERVER_URL` in production points at port 8080 or at nginx is unknown, so check it before closing the port.
- Not re-verified: the lane counts that were not recounted (the 14 unguarded `req.json()` calls, the 9 jurisdiction call sites, the six reset-list variants, the 3,300 test lines), most Medium findings outside the spot checks, and the contents of the tickets marked "(untracked)". Those ticket files exist in the main checkout, but they were not read.
- The severity of E6 depends on how often two large exports overlap, which only usage data can answer.
