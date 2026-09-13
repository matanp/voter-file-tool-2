# 07: The import response is a schema, not a hand-written test type

**Status:** resolved

**Priority:** P3 (follow-up from the branch code review)

**What to build:** A Zod schema for the success response of
`POST /api/admin/bulkLoadCommittees`, living beside the request schema in the shared
validators package, used by the route as its return type and by the route tests as a runtime
parse. Today the response shape exists only as a hand-written `type
BulkLoadCommitteesResponse` local to
`apps/frontend/src/__tests__/api/admin/bulkLoadCommittees.test.ts:64`, and the tests read the
body through `parseJsonResponse<T>`, which is an unchecked `as` cast. A test that casts cannot
fail on contract drift: rename `applied` to `wasApplied` in the route and every assertion that
does not name that field keeps passing, while the local type quietly goes on describing a body
that is no longer sent.

## Why this matters here specifically

This endpoint's response *is* the feature. Ticket 06 shipped the plan as an API response with
no user interface — the plan's counts, removals, discrepancies and rejected rows are what an
Admin reads before deciding to apply a mass membership change. There is no screen that would
break loudly if a field disappeared, and there is no consumer whose types would fail to
compile. The tests are the only thing standing between a serialization change and an Admin
reading a plan that is missing the removals.

Serialization is a real risk, not a hypothetical one. Two fields in the body are shaped by
Prisma rather than by the route:

- `discrepanciesMap[i][1].committee` is a `CommitteeList` row, whose `ltedWeight` is a Prisma
  `Decimal?`. `Decimal` serializes through `JSON.stringify` as a **string**, not a number — so
  the wire shape and the TypeScript type of the row already disagree, and no compile-time type
  can notice.
- `recordsWithDiscrepancies` is an array of raw `VoterRecord` rows. Adding, renaming or
  retyping a column changes this response without any change to this route.

A runtime parse catches both. `satisfies` alone catches neither.

## What the schema covers

New exports in `packages/shared-validators/src/schemas/committeeRosterImport.ts` (already the
home of `bulkLoadCommitteesSchema`), re-exported through the package index like the rest:

- `committeeIdentitySchema` — `cityTown`, `legDistrict`, `electionDistrict`, `termId`, the
  shape `PlannedRemoval.committee` carries.
- `plannedRemovalSchema` — `membershipId`, `voterRecordId`, `name`, `committee`.
- `plannedCapacityFailureSchema` — `committee` (the formatted `cityTown-LD-ED` string),
  `memberCount`, `maxSeats`.
- `rejectedRosterRowSchema` — `sourceRow`, `reason`.
- `importCountsSchema` — `entries`, `matchedVoters`, `activations`, `removals`,
  `discrepancies`, `rejectedRows`, each a non-negative integer.
- `discrepancyEntrySchema` — the serialized `Map` entry: a tuple of `[VRCNUM,
  { discrepancies, committee }]`, where `committee` is the `CommitteeList` row **as it appears
  on the wire** (`ltedWeight` a nullable string, per the note above — confirm against a real
  response before pinning it) and `discrepancies` is a record of field name to
  `{ incoming, existing, fullRow? }`.
- `bulkLoadCommitteesResponseSchema` — the whole success body: `success`, `message`, `dryRun`,
  `applied`, `format` (reuse `rosterFormatIdSchema`), `fileName`, `counts`, `removals`,
  `capacityFailures`, `discrepanciesMap`, `recordsWithDiscrepancies` (reuse
  `voterRecordSchema`), `rejectedRows`. Plus the inferred type
  `BulkLoadCommitteesResponse`, exported alongside `BulkLoadCommitteesRequest`.

**Make the top-level object and every route-built sub-object `.strict()`.** A field the route
adds without the schema naming it should fail the test — that is the drift the review asked to
catch, and an additive change deserves a one-line schema edit. The two Prisma-derived pieces
stay non-strict, because their columns are owned by the schema file and an added column is not
this endpoint's contract changing.

The error bodies are worth naming too, because the route returns four different ones and the
tests currently cast each: `{ error }` for the `VERCEL` guard (status 200), the missing-term
case (503) and the catch-all (500), and `{ success: false, error }` for the archived-format
and bad-`fileName` 422s and the file-not-found 404. Either add a small
`bulkLoadCommitteesErrorSchema` union here or reuse `errorResponseSchema` from
`schemas/report.ts` — pick one and use it for every error assertion in the test file, rather
than leaving half of them cast.

## How it gets used

**Route.** Type the object literal in the final `NextResponse.json(...)` against
`BulkLoadCommitteesResponse` — a `satisfies` clause, so an omitted or misspelled field is a
compile error at the source. Do *not* run `bulkLoadCommitteesResponseSchema.parse()` in the
production path: it would turn a wire-shape surprise into a 500 for an Admin who has just
applied an import, which is worse than returning the surprise. Runtime checking belongs in the
tests.

**Tests.** Add a runtime-parsing helper next to `parseJsonResponse` in
`apps/frontend/src/__tests__/utils/testUtils.ts` — something like
`parseJsonResponseWith(response, schema)` that parses and returns `z.infer<typeof schema>`,
failing with the Zod issue list when the body does not match. Then in
`bulkLoadCommittees.test.ts`: delete the local `BulkLoadCommitteesResponse` and
`PlannedRemoval` types, point `MockPlan` at the shared `counts` type, and route every
`parseJsonResponse<...>` call through the new helper. The mocked plans the tests build must
still produce a body that parses — where a mock currently uses `unknown` for a committee or a
discrepancy, it has to become the real shape, which is the point.

Leave the generic `parseJsonResponse<T>` in place; other route tests use it and converting
them is separate work.

## Acceptance criteria

- [x] `bulkLoadCommitteesResponseSchema` and its sub-schemas live in
      `packages/shared-validators/src/schemas/committeeRosterImport.ts` and are exported from
      the package index, with `BulkLoadCommitteesResponse` inferred from the schema.
- [x] The route's success body is typed against the inferred type at the `NextResponse.json`
      call site, and the production path performs no runtime parse.
- [x] `testUtils` gains a schema-parsing response helper that fails the test with the Zod
      issues when the body does not match.
- [x] `bulkLoadCommittees.test.ts` defines no local response type, and every success-body
      assertion runs through a runtime parse of the shared schema.
- [x] Every error-body assertion in that file parses against a named error schema rather than
      an inline cast.
- [x] Removing or renaming a field in the route's response object fails the test suite —
      demonstrate this once locally before closing (e.g. drop `removals`, watch it go red).
- [x] `ltedWeight`'s actual serialized type is confirmed against a real response and the
      schema matches it, rather than matching the Prisma type.
- [x] Existing behaviour is unchanged: the dry-run/apply split, the archived-format and
      `fileName` guards, and the privilege-gating suite all still pass.

## Out of scope

- Converting other route tests off `parseJsonResponse<T>`. Worth doing, one endpoint at a
  time, and each conversion carries the same "does the mock produce a real body" cost.
- Runtime response validation in production request handling, here or anywhere.
- The known rough edge from ticket 06 — a capacity failure on `dryRun: false` surfacing as a
  generic 500 — is a separate response-shape question and is not fixed by this ticket.

## Comments

Done. `committeeIdentitySchema`, `plannedRemovalSchema`, `plannedCapacityFailureSchema`,
`rejectedRosterRowSchema`, `importCountsSchema`, `discrepancyFieldSchema`,
`discrepancyEntrySchema`, `wireCommitteeListSchema` and `bulkLoadCommitteesResponseSchema`
live beside `bulkLoadCommitteesSchema` in
`packages/shared-validators/src/schemas/committeeRosterImport.ts`, with
`BulkLoadCommitteesResponse` inferred from the last of them. Everything the route or the
importer builds is `.strict()`; the two Prisma-derived rows (`wireCommitteeListSchema`, and
`voterRecordSchema` reused for `recordsWithDiscrepancies`) are left open.

`ltedWeight` is a string on the wire, confirmed rather than assumed:
`JSON.stringify({ ltedWeight: new Prisma.Decimal("12.5") })` gives `{"ltedWeight":"12.5"}`.

Pinning the schema to the wire shape and typing the route against it turned out to be the
same decision. `satisfies BulkLoadCommitteesResponse` can only hold if the object literal
already *is* the wire shape, so the route now converts the two Prisma-shaped pieces itself —
`toWireCommittee` (`Decimal` → string) and `toWireVoterRecord` (three `Date` columns →
ISO strings) — instead of leaving it to `JSON.stringify`. The bytes are identical; what
changed is that the conversion is now stated where a type can check it.

The `satisfies` clause immediately caught unrelated looseness: `validateRequest`'s
`z.ZodSchema<T>` parameter inferred `dryRun` as `boolean | undefined`, losing the schema's
`.default(true)`. Its signature is now
`z.ZodType<Output, z.ZodTypeDef, unknown>`, which preserves the parsed output type. The
whole frontend typechecks and all 1352 tests pass.

`parseJsonResponseWith(response, schema)` sits next to `parseJsonResponse` in
`testUtils.ts` and throws with the Zod issue list plus the received body. The generic
`parseJsonResponse<T>` is untouched for the other route tests.

`bulkLoadCommittees.test.ts` no longer declares a response type: `MockPlan` became
`ImportPlan`, `PlannedRemoval` and `DiscrepanciesAndCommittee` are imported from the
modules that own them, and every success and error assertion runs through
`parseJsonResponseWith`. `bulkLoadCommitteesErrorSchema` is one strict object
(`error` required, `success: false` optional) rather than a union, so `json.success` stays
directly readable in a test.

One mock had to become real: `createMockVoterRecord` fills only the interesting columns,
but `prisma.voterRecord.findMany` returns whole rows and `voterRecordSchema` names them
all. A local `voterRecordRow` helper fills the rest with nulls, taking the column list from
`voterRecordSchema.shape` rather than restating it.

Drift demonstrated both ways before closing:

- Deleting `removals: plan.removals,` — `tsc` fails with TS1360 ("Property 'removals' is
  missing"), and seven tests fail with the Zod issue list.
- Renaming `applied` to `wasApplied` — the strict parse fails with
  `Unrecognized key(s) in object: 'wasApplied'`.
