# CommitteeRequest.committList Typo Fix

**Status:** Planned  
**Source:** [CODEBASE_AUDIT_ANALYSIS.md](CODEBASE_AUDIT_ANALYSIS.md) (lines 91–92), [CODE_REVIEW_RECOMMENDATIONS.md](CODE_REVIEW_RECOMMENDATIONS.md) #10

## Summary

The Prisma relation field `committeList` (missing 't') on `CommitteeRequest` should be renamed to `committeeList`. **No DB migration needed** — the column is already `committeeListId`.

## Fix Scope

| Location | Change |
|----------|--------|
| `prisma/schema.prisma` | `committeList` → `committeeList` (relation field) |
| `handleRequest/route.ts` | Update include + property access |
| `committees/requests/page.tsx` | Update type, include, variable names |
| `handleRequest.test.ts` | Update mock object |

After schema change: `pnpm exec prisma generate`.

## Verification

- `pnpm --filter voter-file-tool test`
- `pnpm --filter voter-file-tool run lint`
