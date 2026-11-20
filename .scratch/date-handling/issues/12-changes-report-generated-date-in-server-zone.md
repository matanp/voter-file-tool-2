# 12 - Changes report's "generated" date uses the server's zone

Status: needs-triage
Source: PR #166 review

Out of this map's scope. Per [../map.md](../map.md), "generated on" stamps belong to the Clock seam effort ("Put 'now'
behind a Clock seam"). It's filed here so it isn't lost. Fix it there, or as a deliberate small exception.

## Problem

`apps/report-server/src/components/ChangesReport.tsx` builds `generationDate` from `new Date().toLocaleDateString(...)`
with no `timeZone`, so it renders in the report server's own zone. On a UTC host, a report generated after about 8pm
Eastern (7pm in winter) is stamped with tomorrow's date. The other report components'
`generationDate`/`toLocaleDateString` stamps (`PetitionOutcomesReport`, `VacancyReport`, `DesignationWeightSummary`,
`CommitteeReport`) look like the same pattern. Check each. `signInSheetHelpers` already formats in
`America/New_York`.

## Fix direction

Format "now" in the organisation's zone (`timeZone: 'America/New_York'`), ideally through one helper or the Clock seam,
not per component.

## Acceptance criteria

- [ ] A report generated at 23:30 Eastern shows that Eastern date, whatever the server's zone.
- [ ] Covered by a test that fixes "now" rather than depending on when CI runs.
