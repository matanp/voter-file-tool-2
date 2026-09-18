# Decide: Leaders lose all access when a new committee term becomes active

Status: needs-info

Found while writing `CONTEXT.md` on 2026-08-29. Recorded so it isn't lost. **Not yet confirmed
as a bug — this may be the intended safe default.**

## What the code does

A Leader's authority is scoped by `UserJurisdiction` rows, and every row is tied to one
`CommitteeTerm` (`termId`). Nothing in the codebase copies rows from one term to the next.
`UserJurisdiction` rows are created in exactly two places:

- `src/app/api/admin/jurisdictions/route.ts:114` — an Admin assigns one explicitly
- `src/lib/applyPendingInvite.ts:288` — an invitee redeems an invite carrying pending assignments

So when a new term is created and made active, every existing Leader has zero assignments in it.

## What the Leader then sees

`getUserJurisdictions` (`src/app/api/lib/committeeValidation.ts:129`) returns:

- `null` for Admin/Developer — unrestricted
- `[]` for a Leader with no assignments in that term

and `buildJurisdictionWhere([])` yields `{ OR: [] }`, which matches nothing. The scoped-report
path is explicit about it: `validateReportJurisdictionAccess` returns "No jurisdictions assigned"
(`committeeValidation.ts:279`).

That is the correct fail-closed behaviour, and the `null`-vs-`[]` distinction is handled
correctly everywhere I looked. The concern is not that it fails open — it doesn't.

## The concern

The transition is silent and total. Flipping `isActive` on a new `CommitteeTerm` drops every
Leader in the county to an empty view at once, with a message ("No jurisdictions assigned") that
reads like a misconfigured account rather than "the term rolled over." There is no signal to the
Admin that N Leaders just went dark, and no obvious in-app path to re-assign them in bulk.

## Questions to answer before doing anything

1. **Is this intended?** Requiring a deliberate re-assignment each term is a legitimate design —
   committee leadership genuinely changes between terms, and carrying stale authority forward
   would be worse. If so, the fix is communication, not behaviour.
2. **How often does a term roll over?** If it is every two years and handled as a planned
   operational event, this matters much less than if terms are created ad hoc.
3. **Does an Admin have a workable re-assignment path today?** Assignments appear to be created
   one at a time.

## Options, if it turns out to need a change

- **Nothing** — document the rollover as a manual operational step and close this
- **Better messaging** — distinguish "you have no assignments in the active term" from "you have
  no assignments at all", so the Leader and the Admin can tell what happened
- **Copy-forward tool** — an explicit Admin action that clones assignments from a prior term into
  a new one, reviewed before it applies. Explicit, not automatic; carrying authority forward
  silently is the failure mode worth avoiding
- **Pre-activation warning** — when activating a term, show how many Leaders have no assignments
  in it

## Related

- `CONTEXT.md` — **Assignment**: "Assignments do not carry across terms." States the fact
  without judging it; that line stays correct whichever way this is decided.
