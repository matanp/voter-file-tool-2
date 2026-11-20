# 02 - Add required test-inclusive typechecks

Status: blocked-by-01

Type: infrastructure

## Why

CI currently runs Jest only. Type-level contract tests and typed mock fixtures can fail locally
without blocking a pull request.

## To do

1. Add a `typecheck:test` script to every package that owns tests.
2. Add `tsconfig.test.json` files where the build configuration intentionally excludes tests.
3. Ensure each configuration includes every ordinary test and type-contract test in its package.
4. Add a root `check:test-types` script that runs the four package checks, preferably concurrently
   while preserving readable package-specific failures.
5. Run `check:test-types` in `.github/workflows/test.yml` as a required step alongside Jest.
6. Keep package build checks separate when their inclusion and emission requirements differ.

## Acceptance

- Changing a typed test fixture incompatibly causes CI to fail before merge.
- `packages/shared-validators/src/__tests__/schemas/reportTypes.test.ts` is included in a TypeScript
  check even though production builds exclude tests.
- The root command succeeds from a clean checkout after dependency installation.
- Failure output identifies the package and the TypeScript diagnostic.

