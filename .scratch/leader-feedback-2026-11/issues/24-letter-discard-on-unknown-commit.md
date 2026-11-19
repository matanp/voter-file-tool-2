# 24 - Don't delete a promoted letter when the commit's outcome is unknown

Status: needs-triage

## Why

PR #154 review 2, finding L1. `exitReport/route.ts` and `remove/route.ts` call `discardPromotedLetter(promoted)`
on any thrown error. That includes `prisma.$transaction` throwing after COMMIT reached the server (for example
the connection drops during commit). Then the row keeps `resignationLetterKey`, but the object it names is
deleted, and "View letter" returns a presigned URL that 404s. The staging copy still exists, but nothing points
at it, and the lifecycle rule removes it after a day.

Rare: it needs a failure between the server committing and the client hearing about it.

## Options

- Discard only on the known-not-written branch (the conditional update matched no row) and leave orphans
  otherwise. Orphans are harmless: cleared letters are already kept under the membership's prefix.
- Or, in the catch, re-read the row and discard only when it doesn't reference `promoted.key`.

## Acceptance criteria

- [ ] A thrown error whose commit may have landed never deletes an object the row references.
- [ ] A lost race (no row written) still deletes the promoted copy and keeps the staging copy for a retry.
- [ ] Both routes are covered by tests.

## Comments

- 2026-11-18: Split from PR #154 review 2 (L1) so it doesn't block the PR.
