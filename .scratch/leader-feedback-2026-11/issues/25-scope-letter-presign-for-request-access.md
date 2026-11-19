# 25 - Scope Resignation Letter presigns to the RequestAccess user's jurisdiction

Status: needs-triage

## Why

PR #154 review 2, finding L3. `api/committee/resignation-letter/upload-url/route.ts` authorizes with
`leaderMayActOnCommittee`, which lets RequestAccess users act on any committee. Ticket 08 decision 9 says
"RequestAccess+, with jurisdiction over the membership's committee".

Effect: any RequestAccess user can put files of up to 10 MB into any active membership's staging prefix. The
staging lifecycle rule deletes them after a day, and a staged file reaches a row only through that user's own
Exit Report, which has the same unscoped check. So the gap is inherited from the `exitReport` / `requestAdd`
policy, not introduced by the letter.

## Scope

Decide whether RequestAccess users should have jurisdiction at all. If they should, scope the presign, the
Exit Report and `requestAdd` together, not just the presign. Read `skills/auth-check-patterns/SKILL.md` first.

## Acceptance criteria

- [ ] A decision on RequestAccess jurisdiction is recorded (here, or in an ADR if it changes policy).
- [ ] If scoped: the presign, Exit Report and request-add routes refuse a committee outside the user's
      jurisdiction, with 403 tests.

## Comments

- 2026-11-18: Split from PR #154 review 2 (L3) so it doesn't block the PR.
