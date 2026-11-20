# 03 - Reject new escape-hatch debt

Status: blocked-by-02

Type: infrastructure

## Why

The repository already has too many violations for an immediate global ban. Without a no-new-debt
gate, cleanup work can be offset by new casts elsewhere.

## To do

1. Add a test-source scanner for:
   - `as never`
   - `as unknown as ...`
   - `as jest.Mock`
   - raw `any`
   - `@ts-ignore`
   - new `getXxxMock` helpers whose methods are raw `jest.Mock`
2. Store existing violations as file-and-location fingerprints in a checked-in baseline.
3. Fail on new fingerprints rather than only comparing total counts.
4. Add an explicit allowlist for approved runtime-boundary helper files.
5. Require a reason comment for an allowed exceptional call-site cast.
6. Run the scanner in CI and expose it through a short root command suitable for local use.

An AST-based scanner is preferable to regular expressions because it can distinguish TypeScript
assertions from comments and strings. Keep the rules small and repository-specific rather than
building a general-purpose linter plugin.

## Acceptance

- Adding a new prohibited assertion to a test makes CI fail with the file, line, rule, and suggested
  replacement.
- Existing baseline violations do not block unrelated work.
- Removing a violation requires removing its baseline entry; removed debt cannot silently return.
- Approved boundary helpers remain usable without per-call-site suppressions.

