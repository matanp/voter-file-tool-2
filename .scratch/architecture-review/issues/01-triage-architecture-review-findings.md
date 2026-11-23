# 01 - Triage the 2026-11-21 whole-app architecture review and its escalations

Status: needs-triage
Type: task

## What

The whole-app architecture review is in
`docs/WHOLE_APP_ARCHITECTURE_REVIEW_claude-opus-5-5_2026-11-21.md` (basis origin/main `dcedbdcc`). It has 21 findings
(3 High, 15 Medium, 3 Low), a deletion budget of about 7,000 product lines, a sequenced Now/Next/Later roadmap, and an
**Escalations** table of 18 defects found along the way (6 High, 11 Medium, 1 Low). It also has a recheck of the July
reviews: 15 of the 27 deduped July findings are still open.

The lane notes and verifier verdicts behind it are in the gitignored
`.review/runs/WHOLE_APP_ARCHITECTURE_REVIEW_claude-opus-5-5_2026-11-21-dcedbdcc/`.

Triage means deciding, item by item, what becomes a ticket, what folds into an existing series, and what is
`wontfix`. Start with the escalations.

## Escalations to route first

Severities are the review's routing estimates. Nothing was run: every item comes from reading code, with no database
access and no race reproduction. "Comments review" means
`.scratch/code-comments-review/issues/01-triage-comments-review-findings.md`, which found some of the same defects.

| Review ID | Severity | Defect | Existing tracking | Likely home |
|---|---|---|---|---|
| E1 | High | Report-server `/start-job` never verifies the HMAC. The frontend signs a different encoding than it sends. `gunzipSync` has no output cap. Port 8080 is open in `main.tf`. Fix order: frontend signs the Buffer, worker verifies before gunzip, then close 8080. | Comments review E3 (untriaged) | `report-server-provisioning` |
| E2 | High | `generateReport` is gated at RequestAccess, so that role can start a `voterImport` with a `fileKey` it chooses, and nothing checks the key prefix. | None | new or `auth-check-patterns` owner |
| E3 | High | Access can't be revoked: no disable column, no revoke route, privilege cached until next sign-in, `signIn` catch fails open. The review gives a manual stopgap. | Fail-open half is comments review E7 | new |
| E4 | High | A double accept on a committee's last seat can flip the just-seated member to REJECTED. | None | `committees-workspace` |
| E5 | Medium | Bulk meeting decisions run in one transaction with a 5 s timeout and no `.max()`. A P2002 is caught inside the transaction, so a race on the last item may return 200 for rolled-back rows. Final review lowered this from High. | Comments review E8 | `committees-workspace` |
| E6 | High | Two heavy report jobs can OOM the 1 GB report-server and lose its in-memory queue. | `report-server-provisioning` 09, 24, 25 | `report-server-provisioning` |
| E7 | High | A voter import can leave half-written data. | None (July finding still open) | new |
| E8 | Medium | Report rows get stuck in PROCESSING or are misreported; callbacks have no retry or timeout. | Restart half: `report-server-provisioning` 25. Failure UI: `reports-polish/01` | `report-server-provisioning` |
| E9 | Medium | The Petition Outcomes report lists every losing and tied candidate twice. | None | `reports-polish` |
| E10 | Medium | A petition outcome can put two ACTIVE members in one seat; no DB constraint backs seat occupancy or the single active term. | None | `committees-workspace` |
| E11 | Medium | `requestAdd` resubmit race. | None | `committees-workspace` |
| E12 | Medium | The roster import removes a sitting member whose row was rejected. The spec doesn't say what should happen. | None | `committees-workspace` |
| E13 | Medium | The Leader-callable legacy `fetchCommitteeList` exposes contact info and DOB. Deleting it is the fix. | `committees-workspace/16` (split recommended) | `committees-workspace` |
| E14 | Medium | Ably tokens are issued with no capability. | None | new |
| E15 | Medium | Bulk PII reads have no audit trail or throttling. | None | new |
| E16 | Medium | Secrets in plaintext in Terraform `user_data` and state; GitHub PAT in the clone URL. | `config-and-secrets` 04, 05; `leader-feedback-2026-11/28` | `config-and-secrets` |
| E17 | Medium | Record search can repeat or skip voters, and shows errors as "No results". | None; maybe `docs/BUGS.md` BUG-002 | new |
| E18 | Low | Lower-impact defects, grouped in the review. | As noted in the review | various |

## Findings and roadmap

The three High findings are the main re-architecture work:

- Finding 1: one canonical route shape. Put parsing, error mapping and Sentry reporting in the existing route
  wrappers (only 12 of 68 route files report to Sentry today).
- Finding 2: one owner module for membership entry transitions, modelled on `membershipExit`.
- Finding 3: make the `Report` row the job's durable state machine and queue.

Use the review's **Sequenced roadmap** section for order. Finding 6 (delete the legacy committees UI, `_prototype/`
and dead routes) is the cheapest large win. Its step 0 should be split out of `committees-workspace/16` so ticket 15
doesn't block it.

## Open questions

- Does production `PDF_SERVER_URL` go to port 8080 or through nginx on 443? Check before closing 8080 (E1 step 3).
- E5: the final review lowered it to Medium because the likely failure is a clean 500. If reorganization-meeting
  batches are large, treat it as High and fix it before the next meeting.
- `loadAdmin` hardcodes two personal email addresses. They are already in public git history. Deleting the route
  (finding 6) removes them from main.

## Comments
