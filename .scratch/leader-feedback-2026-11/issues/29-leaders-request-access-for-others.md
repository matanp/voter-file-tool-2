# 29 - Leaders request committee access for someone else

Status: needs-triage

## Ask

From the 2026-11-21 stakeholder review: "a feature where leaders can put in a user request to give access to their committee to someone else."

Follow-up answers from the same conversation:
- The person gets the same permissions as a Leader for that committee.
- The audit log shows that person as the actor for any requests or changes they make.

## Today

- An Admin can already invite someone as a Leader for a jurisdiction (`admin/users`, `InviteManagement.tsx`). More than one Leader can hold the same jurisdiction, so the access itself works today.
- Every change already audits its actor. The gap is that a Leader can't start the process.

## Proposal

- In the workspace (or the profile sheet), a Leader enters a name and email and picks one of their own jurisdictions.
- That creates a pending access request. An Admin approves it, which creates the usual Leader invite for that jurisdiction and term, or rejects it.
- The requesting Leader sees the request's status.

## Open questions

- Is Admin approval required, or can a Leader grant access directly?
- Can a Leader share only a jurisdiction they hold, or also part of one (a single ED)?
- Do shared assignments end with the term, like other assignments?

## Acceptance

- A Leader can request access for another person, limited to their own jurisdictions.
- Approval produces the same Leader assignment an Admin invite would. Audit entries name the approver and the new user.
- Read [skills/auth-check-patterns/SKILL.md](../../../skills/auth-check-patterns/SKILL.md) before building.
