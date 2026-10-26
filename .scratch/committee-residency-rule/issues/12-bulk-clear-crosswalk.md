# 12 - Give admins a bulk way to clear stale crosswalk rows

Status: ready-for-human
Type: task

## Why

Split out of ticket 09 (finding 4). The batched crosswalk import (`/api/admin/crosswalk/import`)
only inserts and updates rows. It never deletes any. The only delete in the app removes one row at
a time (`/api/admin/crosswalk/[id]`), so ticket 08's cleanup of the mislabelled rows needed direct
DB access.

Old rows aren't harmless. They can make the weighted-table import's LD/ED fallback skip a district
as ambiguous.

## Options

1. **"Replace all" import mode.** An option on the crosswalk import that deletes every row missing
   from the uploaded file, in the same transaction as the writes. This fixes stale rows where they
   come from, and the table can never be left empty halfway through.
2. **"Clear table" admin action.** A separate destructive button, followed by a normal import.
   It's simpler to build, but the table sits empty until the re-import, and eligibility checks fail
   closed while it is.

Either way, the deletion needs an audit entry, and the admin should confirm before it runs.

## Decision

Pending. Pick an option, then move this ticket to `ready-for-agent`.
