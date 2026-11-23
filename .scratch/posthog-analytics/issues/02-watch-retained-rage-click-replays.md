# 02 - Watch the rage-click replays that are still retained

Status: ready-for-human

Replay retention is 30 days, so the May volunteer session is already gone. These sessions still have replays. Watch
them before they expire, note what the user saw, and file a ticket for anything that's a real bug.

| Session | When (UTC) | Role | What to look at | Expires about |
|---|---|---|---|---|
| `01a1cbe5-d3e3-7163-85ef-0ab628469200` | 2026-11-11 18:36 | Admin | Record search "Name" button | 2026-12-11 |
| `01a1cc67-1d55-712f-9d19-c920b03a5737` | 2026-11-11 20:57 | Admin | Committees button rage clicks; **1 console error** | 2026-12-11 |
| `01a1ef5f-8ed9-7f4f-9ad9-5c24152cbd58` | 2026-11-18 15:56 | Admin | Add member ×11, town `<select>` at 16:15:59 (see 01) | 2026-12-18 |
| `01a1f081-c4e7-78bf-a2d6-05993fd28166` | 2026-11-18 21:13 | Admin | Add member ×5 (see 01) | 2026-12-18 |
| `01a1f0b4-fce2-7f6b-8655-16c84dc30240` | 2026-11-18 22:09 | Admin | `/admin/users` "Select city" input; **1 console error** | 2026-12-18 |
| `01a1f529-93e5-76b7-a3ec-2ad87c5a4649` | 2026-11-19 18:55 | Admin | Committees "Petitioned" label, `<select>` | 2026-12-19 |
| `01a1f59d-694c-799b-aaf0-8e52fbbad68c` | 2026-11-19 21:01 | Leader | "Submit candidate" (see 01) | 2026-12-19 |

Also worth a look: an `/admin/election-config` "Delete" rage click on 2026-10-20 (session expired). Check whether
Delete responds slowly or gives no feedback.

To keep a replay past 30 days, add it to a saved playlist in PostHog or export it.
