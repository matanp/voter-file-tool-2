# 01 - Admins approve or deny exit reports from the committees page

Status: resolved

## Ask (verbatim)

> Hey, delete functionality on the committee leader side seems to work great. I don't see anywhere on the admin side to approve them
> Not at my computer but admin should be able to approve / deny right from the committees page

## Notes

- "Delete functionality on the committee leader side" is the Leader's Exit Report, shipped in
  [leader-feedback-2026-11 / 01](../../leader-feedback-2026-11/issues/01-leader-resignation-option.md).
- The second line is our reply (the leader thumbs-upped it). We expected approve / deny to already be on the
  committees page.
- That ticket put Confirm / Reject on the committee's **Pending** tab, next to Submissions. The leader couldn't
  find it, so this may be discoverability (no badge or count on the committees page, no Admin-wide list of
  pending reports) rather than a missing feature. Check what an Admin sees on the committees page before deciding.

## Recording of the current flow (2026-11-15)

Captured on the local dev server with `COMMITTEES_WORKSPACE=1` (the layout production uses). The committee
shown has real member names, so both files are in the repo's gitignored `data/` folder and are never committed.

| File in `data/`                                         | What it is                                                                                                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `leader-feedback-2026-11-11-admin-confirm-exit-report.gif` | ~12 s captioned GIF: header shows "3 pending", then **Pending** filter, Rochester LD 17 ED 1, **Pending** tab, **Confirm**, confirm dialog, then "Confirmed", count drops to 2 |
| `leader-feedback-2026-11-11-admin-pending-tab.png`         | Still of the committee's Pending tab: three reported exits (two resignations, one removal), each with Confirm / Reject                                                   |

What it shows about discoverability: on `/committees` the workspace header already has a pending count and a
**Review pending** button, and committees with pending items show a badge in the list. The `/admin` sidebar
(`apps/frontend/src/app/admin/AdminSidebar.tsx`) has no link to pending requests, which matches the leader's "I
don't see anywhere on the admin side".

## Decision (2026-11-15)

This was discoverability, not a missing feature. The committees page already has Confirm / Reject, a pending count,
**Review pending** and list badges, so it stays as it is. The fix is on the admin side: a **Pending review (N)** item
under *Review Queues* in the `/admin` sidebar, linking to `/committees/requests`
([PR #150](https://github.com/matanp/voter-file-tool-2/pull/150)).

- N counts Submissions plus pending Exit Reports in the active term (`countPendingItems`), county-wide. The
  `COMMITTEES_WORKSPACE=1` header's "N pending" follows the selected town / district, so the two match only when the
  Admin views the whole county.
- The count is read with the viewer's actual privilege and streams in after the page renders.
