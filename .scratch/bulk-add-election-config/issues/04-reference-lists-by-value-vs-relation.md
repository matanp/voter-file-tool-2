# 04 - Revisit holding Reference Lists by value instead of by relation

Status: needs-triage

Raised while grilling `spec.md`, 2026-08-30. Not scoped; recorded so the reasoning
survives.

## The current shape

`OfficeName` and `ElectionDate` are Reference Lists (see §Reference data in
`apps/frontend/CONTEXT.md`): an Admin curates them, they populate two dropdowns on
`/petitions`, and the chosen value is copied into the work at hand rather than pointed at.

Verified 2026-08-30:

- No inbound FK. `office` appears nowhere in `prisma/schema.prisma` outside
  `OfficeName.officeName` itself.
- The petition form puts the office **string** and `formatElectionDateForForm(date)` into a
  transient `GenerateReportData.payload` (`GeneratePetitionForm.tsx:134-144`), which goes to
  report-server and is printed into a PDF.
- `ReportMetadataMap` maps `DesignatedPetition -> null` (`src/types/reportMetadata.ts:12`),
  so the `Report` row keeps only `fileKey` / `title` / `description`. The selection is not
  persisted anywhere.
- Petition outcome tracking does not persist them either. Ticket
  `docs/SRS/tickets/2.6-petition-primary-outcome-tracking.md` (Status: Done) states
  "Use `CommitteeMembership` as the canonical record for challengers and outcomes (no
  separate `PetitionRecord` model in v1)". Outcomes attach to `Seat`, which is already a
  relation (`schema.prisma:394`, `isPetitioned`).

## Why it might be worth reversing

A relation would give referential integrity, make renames propagate, and remove the
case-collision merge problem in `02` — merging "Mayor" and "mayor" would be repointing FKs
rather than rewriting strings and hoping nothing was missed.

## Why it is not scoped now

There is no symptom. Nothing orphans, because nothing stores a reference to orphan. An FK
needs a petition *record* to hang on, and v1 deliberately declined to create one — so the
change would mean introducing a model first, for integrity over a value that is never
stored.

## Trigger to revisit

**If a `PetitionRecord` model (or anything else that persists a chosen Office Name or
Election Date) is introduced, reopen this before it ships.** That is the moment the
by-value shape starts costing something, and the moment the migration is cheapest — before
there are rows.

See also `01-bulk-delete-election-config.md` and
`02-case-insensitive-office-name-uniqueness.md`, both of which are simpler under the
current by-value shape than they would be under relations.
