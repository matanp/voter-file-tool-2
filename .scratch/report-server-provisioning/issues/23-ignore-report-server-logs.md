# 23 - Ignore `apps/report-server/logs/` in git

Status: ready-for-agent
Type: task
Source: production full runs `20261120T061300Z-n795ih` and `20261121T005219Z-mtc4sy`

## Problem

Every PDF validation run on the Lightsail box ends with run-level needs-review:
`deployed-revision: <sha> with local changes: ?? apps/report-server/logs/`. The box's report server writes logs to
`apps/report-server/logs/`, which isn't ignored (the root `.gitignore` only has `/logs/`). Run `20261121T005219Z-mtc4sy`
was otherwise 34 pass, 0 fail.

## Fix

Add `apps/report-server/logs/` (or `logs/` scoped appropriately) to `.gitignore`. Check nothing tracked lives there.

## Acceptance

- After deploying, `git status` on the box is clean and the next harness run has no `deployed-revision` needs-review.
