# 07 - Make the report server fit comfortably in 1 GB (index)

Status: needs-triage
Type: task

## Why

We're staying on `micro_3_0` (1 GB) for now (decided 2026-11-07, see ticket 04). On 2026-10-15, one PDF report took
the box down to 75Mi of available RAM, with 620Mi of 649Mi swap in use. PR #141 adds swap and closes Chrome when a
report fails, but swap only makes running out of memory slower. The goal is to need less memory.

This file is an index. The work is split into one ticket per fix:

| # | Ticket | Status | Size |
|---|---|---|---|
| 08 | Measure memory process by process (the baseline for everything below) | ready-for-human | small |
| 09 | Avoid two copies of Chrome without giving up concurrency (shared browser, render lock, or nothing; re-evaluate after 10–12) | needs-triage | small–medium |
| 10 | Start compiled JS under plain node (no pnpm, `tsc`, Tailwind or ts-node on restart) | resolved (PR #144) | medium |
| 11 | Cap node's heap and set a PM2 memory limit that can fire | resolved (PR #146) | small |
| 12 | Try Puppeteer's lighter `chrome-headless-shell` | PR #148 open; waits for 19's pre-#148 box run | small |
| 13 | Turn off services the box doesn't need | ready-for-human | small |
| 14 | Build the report server elsewhere and copy it over (no installs on the box) | needs-triage | large |
| 15 | Move PDF rendering off the box, or stop using a browser (blocked by 08, 09, 12) | needs-triage | large |

## Suggested order

1. Recreate (`../recreate-checklist.md`), then do 08 to get the baseline.
2. Do 10, 11 and 12, measuring before and after each (ticket 08 method). Running several jobs at once is worth keeping
   (decided 2026-11-08), so 09 waits for these numbers.
3. Re-evaluate 09 with those measurements (ticket 08 step 3: two reports back to back). Do 13 alongside.
4. Decide on 14 and 15 only if a report still pushes the box deep into swap, or deploys still struggle.

## Comments
