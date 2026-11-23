# 36 - A successful governance save with a non-JSON reply shows "Save failed"

Type: task
Status: ready-for-agent
Parent: ../map.md
Tier: 3 (polish) · Priority: P3
Source: final review of PR #185 ([32](32-field-errors-follow-ups.md)); older than that PR

## Problem

`onSubmit` in `apps/frontend/src/app/admin/governance-config/GovernanceConfigClient.tsx` calls
`await response.json()` before it checks `response.ok`. If a save succeeds but the reply has no body or is not
JSON (a 204, or a proxy or CDN page), `json()` throws, the `catch` runs, and the admin sees "Save failed" with
a raw `SyntaxError` message, although the config was saved. A non-OK reply that isn't JSON (an HTML error
page) also shows the raw `SyntaxError` text instead of the status.

`PATCH /api/admin/governance-config` always returns JSON today, so this only happens if something between the
browser and the route replaces the body. PR #185 already handles a successful reply that is JSON but doesn't
match the schema: the page says it saved and reloads the settings.

## Fix

Read the body without letting a parse error decide the outcome. For example, read `response.text()` and parse
it only when it isn't empty, catching parse errors. Then:

- a 2xx with no readable body takes the same path as PR #185's unreadable-body branch: "Governance config
  saved", drop the form, refetch;
- a non-2xx with no readable body shows `Save failed with status N`.

## Acceptance criteria

- [ ] A 2xx with an empty body, and a 2xx with a non-JSON body, show "Governance config saved" and reload the
      settings. No "Save failed" toast.
- [ ] A 500 with an HTML body shows "Save failed with status 500", not a `SyntaxError` message.
- [ ] Tests in `__tests__/app/admin/governance-config/GovernanceConfigClient.test.tsx` cover these three
      cases, and the existing tests still pass.
