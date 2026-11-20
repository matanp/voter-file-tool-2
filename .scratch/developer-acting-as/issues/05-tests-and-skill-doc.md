# Tests and auth-skill doc update

Status: ready-for-agent
Type: task
Blocked by: 02, 03

## Tests

- `resolveActing`: returns state for Developer with valid cookie; `null` for tampered signature,
  malformed JSON, schema violation, or non-Developer real privilege.
- `/api/developer/acting`: PUT 403 for Admin; PUT 200 + GET round-trip for Developer; DELETE clears.
- `getUserJurisdictions` with acting Leader → returns acting jurisdictions, no DB call (assert the
  prisma mock is not invoked).
- `validateReportJurisdictionAccess` with acting Leader → denies out-of-scope town, allows
  in-scope, denies countywide.
- `committees/page.tsx` (`loadScopedReportPageData`-style test or RSC test): acting Leader with
  one scope → `initialScope` set; with two → `null`.
- `ScopedReportForm.test.tsx:163,228` currently pass `PrivilegeLevel.Developer` as the user
  privilege — add a case where `acting` is Leader and assert the countywide radio is hidden.
- `CommitteeSelector.initialScope.test.tsx` — add an acting-Leader case.

## Doc

`skills/auth-check-patterns/SKILL.md`:

- Replace the "If a feature requires full server-rendered role simulation, first design…"
  paragraph with a description of the shipped mechanism: cookie, `resolveActing`, `session.acting`,
  and the behaviour-vs-authorization rule of thumb from ticket 02.
- Update the table: "Acting privilege" source becomes `session.acting` on the server and
  `GlobalContext.actingPrivilege` (mirror) on the client.
- Add to the review checklist: "Does a Developer acting as Leader with jurisdictions see only those
  jurisdictions on `/committees` and get denied on out-of-scope reports, while real API
  authorization is unchanged?"

## Done when

- All of the above pass in `pnpm test`; typecheck clean.
- The skill doc no longer describes acting privilege as client-only.
