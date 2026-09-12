# 02 - Enforce office name uniqueness case-insensitively at the DB level

Status: needs-triage

Deferred from `.scratch/bulk-add-election-config/spec.md`.

`OfficeName.officeName` has a case-sensitive unique index, but
`src/app/api/admin/officeNames/route.ts` checks for duplicates with a case-insensitive
query. The app layer is therefore the only thing preventing "Mayor" and "mayor" from
coexisting, and that check is racy — two concurrent requests both pass it and the DB
accepts both.

Bulk add works around this by matching case-insensitively in the preview, in the in-batch
dedupe, and in the server precheck, so it stays consistent with existing behavior. The
underlying constraint gap is untouched.

Fix would be a migration adding a functional unique index on `lower(officeName)` (or a
generated normalized column).

Still blocked, but on a narrower question than it was. `03` established (2026-08-30) that
**nothing references an Office Name** — no FK, and no stored copy of a chosen value — so
merging a case-colliding pair does *not* require repointing anything. Already-generated
PDFs keep whatever casing they were printed with, and are immutable.

What remains open is a pure data question: do rows colliding only by case exist in
production, and if so which casing wins? The migration fails until they are merged, and
that choice is an Admin's, not an agent's.

Note that a relation would have removed this class of merge problem entirely — recorded,
unscoped, in `04-reference-lists-by-value-vs-relation.md`.
