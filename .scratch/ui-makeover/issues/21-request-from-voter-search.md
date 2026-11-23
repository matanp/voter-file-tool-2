# 21 - Leaders request committee adds and contact updates from voter search

Status: needs-triage

Part of [ui-makeover](../spec.md). Pairs with [09](09-record-search-list-detail.md) and committees-workspace/28.

## Ask

Verbatim, from a stakeholder chat on 2026-11-21:

> Do you have it that leaders can request from voter search to do committee adds or contact info update?

The maintainer replied that it doesn't exist yet and is a good idea. The same chat produced the spec's "Act where you look" principle; this ticket is one instance of it, and [22](22-cross-link-audit.md) looks for others.

## Today

No. `/recordsearch` is read-only.
- **Committee adds** start only from a seat in the committees workspace: seat → Add → candidate search (`committees/workspace/drawer/AddMemberFlow.tsx`, `CandidateSearchStep.tsx`). That posts to `/api/committee/requestAdd` (Leader submission) or `/api/committee/add` (Admin). A Leader who finds a voter in search has to note them, open `/committees`, pick the ED and seat, and search again.
- **Contact info updates** don't exist anywhere. Fixing a member's phone or email means remove and re-add. committees-workspace/28 adds "Edit contact info" to the seat menu; it is `needs-triage`, and it is still undecided whether a Leader's edit applies directly or waits for Admin approval.
- Record search already shows a committee badge for active members when the viewer may see it (`recordsearch/CommitteeMembershipBadge.tsx`).

## Proposal

Put the actions in 09's voter detail pane (the sheet on phones), shown only when the viewer may use them:
- **Request committee add.** For a voter in the Leader's scope who isn't an active member: open the existing `AddMemberFlow` in an `ActionDrawer` (05) with the candidate already chosen. The Leader picks the committee (default: the voter's own ED, if it is in scope) and the seat. Reuse `useCandidateEligibility` and the `requestAdd` preflight; don't fork them.
- **Update contact info.** For a voter who is an active member of a committee the Leader manages: the same form as committees-workspace/28, mounted from search. Build 28 first and reuse it here.
- Admins get the same actions; for them the add applies directly, as in the workspace.

Read `skills/auth-check-patterns/SKILL.md` first. The server routes already enforce scope; the UI must hide what the user can't do, not only rely on the server.

## Open questions

- Can a Leader request an add for a voter outside their own LD or ED? Today's workspace flow only reaches seats in scope.
- Does a contact update from search need Admin approval? This is the same open question as committees-workspace/28; decide it once there.
- Should a contact update be offered for voters who aren't committee members? (There's no stored contact for non-members today, beyond the BOE record.)

## Acceptance (once decided)

- From a voter's details in record search, a Leader can submit a committee add request without leaving the page, and it appears in the workspace's Pending tab.
- A Leader can update a member's contact info from the same place, with the same rules and audit row as 28.
- Neither action is shown to a user who can't use it, at 375 and 1280.

## Blockers (once triaged)

- 09 (detail pane) and 05 (`ActionDrawer`) for the add.
- committees-workspace/28 for the contact update.
