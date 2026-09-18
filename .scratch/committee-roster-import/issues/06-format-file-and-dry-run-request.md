# 06: The Admin chooses the format, the file, and whether to write

**What to build:** An Admin drives the import by naming what they are importing and asking what
it would do. `POST /api/admin/bulkLoadCommittees` gains a validated request body — `format`,
`fileName`, and `dryRun` defaulting to `true` — added to the shared validators package alongside
the existing committee discrepancy schema. Today the endpoint reads one hardcoded path, so
putting a new file next to the old one changes nothing.

The Admin states the format rather than the system guessing. Content detection is out: the new
file demonstrates that a wrong-format read can satisfy every structural check while producing
garbage, and the consequence is mass membership removal rather than an error. Only formats with
status `current` are accepted from the API; requesting an archived format returns a validation
error naming it as archived, so an Admin cannot fire the previous term's parser at a term that
is already loaded. Archived parsers remain reachable from scripts and seeding.

A dry run returns the plan and writes nothing; `dryRun: false` applies. The default is the safe
one — an operator who omits the flag gets a plan, not a mass removal. The response carries the
plan in both cases: counts, removals, discrepancies and rejected rows, plus confirmation of what
was written when applied. Existing response fields that still have meaning are preserved.

The file continues to be read from the existing local data directory and the existing
environment guard stays; presigned upload is separate work and folding it in here would couple a
correctness fix to an infrastructure change. There is no user interface for this — the plan is an
API response, not a screen.

**Blocked by:** 03, 05

**Status:** resolved

- [x] The endpoint validates a body of `format`, `fileName` and `dryRun` via a schema in the
      shared validators package, with `dryRun` defaulting to `true`
- [x] `fileName` resolves within the existing local data directory, and the existing environment
      guard and Admin privilege gating are unchanged
- [x] A dry run returns the plan and performs no writes; omitting `dryRun` behaves as a dry run;
      `dryRun: false` applies
- [x] An unknown format is rejected with a validation error, and an archived format is rejected
      with an error naming it as archived
- [x] The response carries counts, removals, discrepancies and rejected rows in both cases, plus
      what was written when applied, preserving existing response fields that still have meaning
- [x] The no-active-term case still returns its existing status, and the existing
      privilege-gating test still passes

## Comments

`bulkLoadCommitteesSchema` lives in
`packages/shared-validators/src/schemas/committeeRosterImport.ts`: `format` (a zod enum over
a `ROSTER_FORMAT_IDS` tuple), `fileName` (trimmed, non-empty), `dryRun` (boolean,
`.default(true)`). The frontend registry is `satisfies Record<RosterFormatId, RosterFormat>`
against that tuple's type, so a parser registered without being named in the contract — or
named without a parser — is a compile error in either direction.

Request handling order: `VERCEL` guard → body validation → archived-format check → file-name
guard → active term → file exists → parse → plan or apply. Admin gating
(`withPrivilege(PrivilegeLevel.Admin, …)`) and the environment guard are untouched.

- **`fileName` guard.** `resolveRosterFilePath` refuses any `/`, `\\`, absolute path, or
  `path.basename(fileName) !== fileName`, then resolves against
  `path.resolve(process.cwd(), "data")` and requires the result to stay under it. A refusal
  is a 422 raised *before* any `fs` call; a name that passes but does not exist is a 404.
- **Archived formats** are rejected in the route, not the schema, because the registry owns
  status: a 422 naming the format and saying it is archived. `parseWithFormat` itself is
  unrestricted, so scripts and seeding keep the archived parser.
- **Response** (both modes): `success`, `message`, `dryRun`, `applied`, `format`, `fileName`,
  `counts`, `removals`, `capacityFailures`, `discrepanciesMap`, `recordsWithDiscrepancies`,
  `rejectedRows`. `applied` is the field that distinguishes a plan from a write. A dry run
  never touches `committeeUploadDiscrepancy` — asserted, not assumed.
- `loadCommitteeLists` is deleted along with `BulkLoadResult` and the hardcoded file/format
  constants: with format and file name as request input there is no second way in. Its only
  importers were the route and one test, which now drives `parseWithFormat` +
  `applyRosterImport` directly.
- **Known rough edge:** a capacity failure on `dryRun: false` reaches the caller as the
  endpoint's generic 500, because applying throws. The plan names every offending committee,
  so a dry run tells the Admin exactly which ones — but the applied path does not repeat it.
  Worth a follow-up if the endpoint ever gains a caller.
