# 21 - Pending and History disagree on whether Leaders see VRCNUM and replacement targets

Type: grilling
Status: resolved
Parent: ../map.md

Found in branch review of `committees-workspace` against `main` (2026-10-14, at `fdddbda`).

## Problem

The detail endpoint (`apps/frontend/src/app/api/committee/[committeeListId]/detail/route.ts`) applies two different rules to the same facts:

| Fact | `pending[]` (Pending tab) | `history.events` (History tab) |
| --- | --- | --- |
| Candidate's VRCNUM | sent to Leaders (`voterRecordId`) | Admin-only (`member.voterRecordId`) |
| Whom a submission replaces | sent to Leaders (`replacementFor`, `route.ts:221`, name + VRCNUM) | Admin-only (`submitted.replacementFor`) |

The schema comments call the Pending behaviour deliberate ("Leader-visible, like roster occupants"). The history inventory §4 privilege matrix makes the same fields Admin-only. So a Leader can see on the Pending tab exactly what the History tab hides from them for the same submission.

## Question for the human

Which rule is right?

- **Leader-visible in both:** relax the history's `adminOnly` for `member.voterRecordId` and `submitted.replacementFor`, and update the inventory §4 matrix.
- **Admin-only in both:** drop `voterRecordId` and `replacementFor` from `pending[]` for non-Admins, and adjust `PendingSubmissionItem` (it renders `VRCNUM` and "Replaces …" today).
- **Keep the split**, with the reason recorded here (e.g. pending is actionable, history is an audit trail).

Record the answer, then make a follow-up `ready-for-agent` ticket if code changes.

## Comments

## Answer

**2026-10-14: keep the split. No code change.** `pending[]` is actionable work in flight: a Leader is acting on their own submission and needs the candidate's VRCNUM and the replacement target, the same way they see roster occupants. `history.events` is an audit trail across everyone's actions, so it keeps the inventory §4 privilege matrix (`member.voterRecordId` and `submitted.replacementFor` Admin-only). No follow-up ticket.
