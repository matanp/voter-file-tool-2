# Whole-App Review Future Considerations

Forward-looking ideas for improving review quality, repeatability, and extensibility. These are not
current methodology requirements; promote them into the base methodology, vector overlays, or
tooling once they are proven useful.

## Tooling hardening

- Add direct `node` / `bash` fallback commands for every `pnpm review:*` script, or document them
  beside the `pnpm` commands. This keeps reviews runnable when the package-manager wrapper blocks on
  lockfile or non-TTY install behavior.
- Move scan definitions and scan-profile membership out of shell `case` statements into a data file
  such as `scripts/review/scans.conf` or `scripts/review/scans.json`.
- Extend `review:doctor` to validate the scan data file, vector registry, methodology docs, skill
  overlays, expected extra tools, and stale command examples as one system.
- Replace the non-NUL fallback in `scan_manifest` with a path-safe loop or `rg --files-from` style
  approach if available, so fallback scanning stays robust for unusual paths and larger manifests.
- Add a generated `.review/subsystem-coverage.tsv` where lane reviewers record subsystem, depth,
  sampled files, scans used, and owner. The final editor can then spot under-reviewed areas before
  merging findings.

## Methodology improvements

- Add an explicit coverage-calibration step before finalizing: confirm each high-depth subsystem has
  at least one boundary-file read, one scan triage pass, and one lane note, even if it produced no
  finding.
- Add a standard "evidence strength" tag for draft findings, such as observed bug, contract mismatch,
  invariant gap, mechanical scan only, or hypothesis. The final editor can then filter weak items
  more consistently.
- Add a follow-up remediation verification methodology that consumes a completed findings document
  and classifies each item as fixed, partially fixed, not fixed, or regressed. Keep it separate from
  findings-only reviews.
- Add a small cross-vector routing table for common borderline cases, such as missing guards,
  inconsistent envelopes, over-broad PII fields, missing tests, and schema-shape concerns.
  *(Partial: data-lifecycle methodology now includes a routing table.)*
- Require each vector overlay to list its extra tooling explicitly, including optional tools such as
  `review:route-inventory`, `review:report-matrix`, and `review:test-map`.

## Better review tools

- Improve `review:test-map` so high-risk route families are derived from route metadata: HTTP method,
  wrapper, required privilege, path family, Prisma writes, report/upload/audit/committee keywords,
  and public/backend exceptions.
- Have `review:test-map` distinguish a mirrored test file from actual proof of unauthenticated,
  insufficient-privilege, cross-scope, validation, and race/idempotency cases.
- Make `review:report-matrix` AST-backed or registry-backed instead of regex-backed, so it survives
  refactors in report schemas, UI registries, and worker dispatch.
- Add an API response-envelope matrix that samples route return shapes and compares them against
  `useApiQuery` / `useApiMutation` expectations.
- Add a Prisma write matrix that groups writes by model, transaction usage, audit write proximity,
  and find-then-write patterns.
- Add an exposure matrix for exports/downloads/uploads: route, privilege, owner/scope proof, file URL
  lifetime, generated filename fields, and whether PII crosses a client or external-storage boundary.

## Candidate new vectors

- **Frontend State & Interaction Correctness:** stale cache, optimistic UI, double submit, destructive
  confirmation, loading/error state, undo behavior, and server/client permission drift.
- **Accessibility & Mobile Operability:** keyboard paths, form labels, modal focus, table overflow,
  mobile admin/report workflows, and screen-reader clarity on dense operational pages.
- **Performance & Scale:** voter search query shape, Prisma select discipline, large-table rendering,
  report-generation memory, import batch size, queue pressure, and N+1 risks.
- **Dependency & Supply Chain Health:** package-manager compatibility, dependency drift, vulnerable
  packages, workspace build boundaries, and runtime version assumptions.
- ~~**Data Lifecycle & Retention:**~~ promoted — see `data-lifecycle` vector in
  `scripts/review/vectors.conf` and
  [WHOLE_APP_DATA_LIFECYCLE_RETENTION_REVIEW_METHODOLOGY.md](./WHOLE_APP_DATA_LIFECYCLE_RETENTION_REVIEW_METHODOLOGY.md).
- **Developer Experience & Local Reproducibility:** setup drift, seed data, test database ergonomics,
  scripts that require external state, and whether a new contributor can reproduce review findings.

## Extensibility checklist for adding a vector

- Add one row to `scripts/review/vectors.conf`.
- Add the scan profile and any new scan definitions.
- Add `docs/review/WHOLE_APP_<VECTOR>_REVIEW_METHODOLOGY.md`.
- Add `skills/whole-app-<vector>-review/SKILL.md`.
- Add any extra review artifact tool if the vector needs structured evidence.
- Update `docs/review/README.md`, `skills/whole-app-review/SKILL.md`, and
  `skills/whole-app-review/reference.md`.
- Run `review:doctor`, `review:freeze <vector>`, `review:scans <vector>`, and a scope-gate smoke
  test against a tiny draft deliverable.
