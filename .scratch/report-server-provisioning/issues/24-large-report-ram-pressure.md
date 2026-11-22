# 24 - Large reports push the 1 GB box deep into swap, whichever Chrome renders them

Status: needs-triage
Type: research

## Why

Ticket 20's measured run (`20261121T022842Z-ryqmd4`, 2026-11-21, on the box, pre-#148 build `af3fe0f9`) rendered each
large fixture 3 times per browser. The service was running normally alongside. Small and medium reports leave plenty
of headroom. The 800-row rosters use up almost all of the box's RAM and push hundreds of MiB into swap, in both
full Chrome and chrome-headless-shell.

Medians of 3 repetitions. MemAvailable and swap are system-wide, sampled every 100 ms. The idle baseline is about
600–630 MiB available and about 220 MiB of swap in use.

| Fixture | Browser | Chrome tree peak | Harness peak (worker + Chrome) | Min MemAvailable | Max swap used | Render time |
| --- | --- | --- | --- | --- | --- | --- |
| roster-large-800x4 (3,200 rows, 134 pages, 19 MB PDF) | chrome | 651 MiB | 723 MiB | **64 MiB** | 355 MiB | 52 s |
| roster-large-800x4 | shell | 671 MiB | 731 MiB | **47 MiB** | 315 MiB | 60 s |
| legacy-large-800x4 (3,200 rows, 134 pages, 22 MB PDF) | chrome | 718 MiB | 761 MiB | **26 MiB** | 570 MiB | 61 s |
| legacy-large-800x4 | shell | 729 MiB | 743 MiB | **19 MiB** | 688 MiB | 72 s |
| typical (roster-ed45-split, signin-151, *-200) | chrome | 373–421 MiB | 492–553 MiB | 400–445 MiB | ~222 MiB | 2–6 s |
| typical | shell | 244–284 MiB | 366–423 MiB | 437–486 MiB | ~222 MiB | 3 s |

How to read the large rows:

- RSS counts only what is in RAM. Once MemAvailable is down to 20–60 MiB, the rest of the working set is in swap.
  The ~650–730 MiB peaks are the ceiling the box allows, not what Chrome needs. The real working set is larger, and the
  two browsers can't be told apart from these numbers.
- Most of the time goes to Chrome generating the PDF. Run `20261121T005219Z-mtc4sy` showed `page.pdf()` taking
  46–49 s of the 56–64 s on the 800-row rosters. The rising swap during that step suggests it is paging.
- Box: Lightsail `micro_3_0`, 945 MB RAM, 2,698 MB swap (ticket 17). Swap is already large, which is why the box
  survives. Adding more swap would not make these renders faster or safer.

## What doesn't fix it

- **chrome-headless-shell (ticket 12, PR #148).** It saves about 130 MiB per typical report (about 35%), but nothing on
  the 800-row rosters. As of 2026-11-21 the maintainer prefers staying on full Chrome for its support and fidelity,
  since headless-shell doesn't address this.
- **More swap.** See above.

## Risks today

- `QUEUE_CONCURRENCY = 2` (`apps/report-server/src/index.ts`, ticket 09). Two large reports at once, or a large one
  plus a typical one, would need about 1.1–1.4 GB of Chrome on a box that a single large report already fills. Expect
  heavy thrashing or the OOM killer.
- Node's heap is capped and PM2 has a limit (ticket 11), but Chrome is a separate process tree and isn't covered by
  either.
- Slow renders hold a queue slot for over a minute, and the rest of the box (sshd, the service's own Node) competes for
  the same pages.

## Questions to answer first

1. **How big do real reports get?** The 800 × 4 fixtures are synthetic. Find the largest real jobs (rows and pages per
   report type) from production job history or the data. If no real report comes close to 3,200 rows, this is a
   guard-rail problem, not an everyday one.
2. **Where is the threshold?** Measure page count against peak and swap (ticket 20's `--measured` with intermediate
   fixtures, e.g. 200, 400, 800 rows) to find the size at which a report starts paging.

## Options (decide after the questions)

1. **Render big reports in chunks.** Render N pages' worth of rows per `page.pdf()` and merge the PDFs (for example
   with `pdf-lib`), so Chrome's peak follows chunk size, not report size. Page numbering ("Page N of M") and repeated
   headers need care.
2. **Size-aware concurrency.** Let a job above a row threshold take both queue slots, so it never runs alongside
   another PDF. This fits ticket 09's "keep concurrency" decision.
3. **Cap report size.** Refuse, or split into several files, reports above a row limit, with a clear message in the UI.
4. **Bigger box** (`small_3_0`, 2 GB). Simplest, and has an ongoing cost. Ticket 04 has the earlier decision to stay
   on 1 GB.
5. **Move rendering off the box** (ticket 15).
6. **One memory limit for node and Chrome together (cgroup).** This is a guard rail, not a fix: it keeps big
   renders from starving the rest of the box. Big renders would still be slow, or would fail. It can be done
   independently of options 1–5, and probably should be.
   - Why it works: `pm2 startup` installed `pm2-bitnami.service` (ticket 17). systemd starts the PM2 daemon, the
     daemon starts node, and node launches Chrome, so all of them are in that unit's cgroup. A limit on the unit
     covers Chrome, which `--max-old-space-size` and `max_memory_restart` can't see.
   - Change: a drop-in at `/etc/systemd/system/pm2-bitnami.service.d/memory.conf` with `MemoryHigh=` and
     `MemoryMax=`, then `systemctl daemon-reload`. Add it to provisioning (`06-setup-pm2.sh`) so a recreated box
     gets it too.
   - What the limits do (cgroup v2): above `MemoryHigh`, the kernel reclaims and swaps the service's own pages,
     which slows the service down but leaves sshd and the rest of the box alone. At `MemoryMax`, it reclaims
     harder, and only OOM-kills inside the unit (usually the biggest process, Chrome) if it can't. Big renders
     should therefore get slower rather than fail, unless swap is capped too with `MemorySwapMax=`.
   - Pick values from the table above. The idle box has ~600 MiB available, and the service plus one typical
     report peaks at ~550 MiB. Something like `MemoryHigh=550M` and `MemoryMax=700M` is a starting point to
     measure, not a decision. Re-run ticket 20's `--measured` with the drop-in in place and compare render time and
     Min MemAvailable.
   - Check first: the cgroup must actually contain node. If the daemon was started by hand from SSH (for example
     `pm2 kill` followed by `pm2 start`), it runs in the SSH session's scope and the limit covers nothing. Confirm
     that `systemctl status pm2-bitnami` lists `node .../dist/index.js` and the Chrome processes under `CGroup:`.
     Also confirm cgroup v2 (`stat -fc %T /sys/fs/cgroup` prints `cgroup2fs`).
   - Ticket 26 covers replacing PM2 with a plain systemd unit, which also frees PM2's ~50 MiB. Do this option
     first, because it doesn't depend on ticket 26.
7. **Keep apt out of report hours (small, optional).** `apt-daily.timer` has `RandomizedDelaySec=12h`, so it fires
   at any hour, and the `unattended-upgrade` Python process briefly takes tens of MiB. That's harmless alone, but
   could tip an 800-row render from swapping into the OOM killer. Fix: drop-ins under
   `/etc/systemd/system/apt-daily.timer.d/` and `apt-daily-upgrade.timer.d/` that clear `OnCalendar=` and set
   `07:00` / `07:30` UTC (2–3am Eastern) with `RandomizedDelaySec=30m`, in provisioning. Security updates still run
   daily. Ticket 13 has the audit (2026-11-21).

Related: 07 (index), 08 (measurement method), 09 (concurrency), 12 (headless-shell), 15 (off-box rendering), 17
(swap), 20 (measured runs), 27 (untagged PDFs: tagging is ~13–15% of the large-roster peak).

## Findings: chunked rendering (2026-11-20, PR #179)

Option 1 is implemented in PR #179 (committee reports only: `ldCommittees`, `committeeRoster`). The PR has the
details. In short:

- **Chrome's peak memory follows how many pages it prints, but it only drops with a fresh browser per slice.**
  `page.pdf({ pageRanges })` on one DOM barely helps (988 → ~943 MiB roster), because Chrome lays out the whole
  document anyway. Slices printed in one browser (same tab, new tab, `about:blank`) climb ~40–55 MiB per 10 pages,
  because memory isn't given back between prints. A new browser context crashes under `--single-process`. A fresh
  browser per 20-page slice: 449 / 507 MiB (roster / legacy) vs 988 / 1351 MiB whole (local Chrome tree RSS).
- **Linux, container capped at 620 MiB:** whole roster swaps 446 MiB, and whole legacy is OOM-killed (the VM has
  1 GiB swap). 20-page slices: 0 swap for both. Uncapped peaks: 447 / 541 MiB sliced vs 906 / 1245 MiB whole.
  34-page slices peak at ~600–626 MiB and 50-page slices swap, so 20 pages leaves room for `QUEUE_CONCURRENCY = 2`.
- **Tags survive the merge.** It has to namespace element IDs per slice, because every fresh browser reuses
  `node00000022`… and every `TD`'s `/Headers` points at those IDs. Compared with a whole-report print, the merged
  800x4 PDFs have an identical structure tree (elements, MCIDs, header associations), identical text, identical
  pixels, and identical veraPDF PDF/UA-1 results (3 failures, all from Chrome itself).
- **Cost:** slower locally (5 s → 12–14 s, ~1.4 s per launch plus a 1.2–1.9 s merge). Node heap during the merge
  is 124 MiB for legacy 134 pages (cap 384 MB). Box timing is not measured yet.
- **Next:** after deploy, run `pdf-validation render --mode full` and a `--measured` run for the two 800x4
  fixtures on the box. Options 2 (size-aware concurrency) and 6 (cgroup limit) are still worth doing as guard
  rails. Question 1 (real report sizes) is still open, but slicing only applies above 20 pages, so the answer
  doesn't change it.

### Without `--single-process` (2026-11-21)

Tested whether one long-lived browser could replace a fresh Chrome per slice. Without `--single-process`, each
tab gets its own renderer process. Full Chrome, 20-page slices, Linux container (Puppeteer 23.11.1 image,
emulated amd64, cgroup `memory.peak` for node + Chrome). Native Mac timings without memory sampling, 2 runs.

| | Peak, no cap | Peak / swap, 620 MiB cap | Held between slices | Mac time (roster / legacy) |
| --- | --- | --- | --- | --- |
| Small 10-page report, `--single-process` | 392 | | | 1.4 s |
| Small 10-page report, without it | 518 | 516 / 0 | | 1.5 s |
| Roster slices, fresh `--single-process` Chrome each (PR #179) | 459 | 441 / 0 | ~90 | 10.6–11.2 s |
| Roster slices, one browser without it, new tab each | 610 | 584 / 0 | ~440 | 14.5–14.6 s |
| Roster slices, one browser without it, same tab reused | 694 | | 537 → 668, climbing | |
| Legacy slices, fresh `--single-process` Chrome each (PR #179) | 559 | 509 / 0 | ~90 | 11.2–11.4 s |
| Legacy slices, one browser without it, new tab each | 667 | 620 / 27 | ~440 | 15.3 s |

- The renderer PID changes with every new tab, and the old renderer exits, so memory stays flat across slices.
  Reusing one tab keeps one renderer, and memory climbs as it does under `--single-process`.
- Keeping the browser open still costs ~125–150 MiB more at peak, and ~440 MiB held while it stays open. That's
  about ten processes (browser, utility and network service, zygotes). Ticket 12 saw the same with headless-shell.
- Natively it's also slower (~4 s more per 134-page report), since a launch costs only ~0.4 s. Only under
  emulation did tabs look faster (30 s vs 50 s), because emulation makes launches expensive.
- Decision: keep `--single-process` and a fresh browser per slice.

## Findings: trimming the DOM (2026-11-20)

Question: can leaner committee-report markup lower Chrome's peak? Answer: not by trimming. Chrome's table layout and
tag tree drive the peak, not the element count. Two throwaway experiments ran on `1032ac09` (after #178): local macOS,
production launch args and PDF options. Compare the deltas; macOS absolutes run ~25% above the box.

**Real 800x4 fixtures** (Chrome peak, median of 5 tagged and 3 untagged runs; pixels compared with
`pdftoppm -r 72 -gray`; `pdftotext -layout` was identical for every variant):

| Variant | Roster tagged | Legacy tagged | Roster untagged | Legacy untagged | Pages differ |
| --- | --- | --- | --- | --- | --- |
| Baseline | 903 MiB | 1211 MiB | 756 MiB | 1000 MiB | – |
| Classes in one table CSS rule, `data-committee-*` hooks removed | 897 | 1199 | 753 | 1001 | 0 |
| Also no spacer rows, `<col>`s or page-break div (−1.6k / −0.9k nodes) | 892 | 1200 | 752 | 1001 | 0 |
| Tables replaced by flex divs and spans (same node count) | 668 | 847 | 602 | 734 | roster 0, legacy 41 |
| Divs with Serve ED drawn by `::before` (−6.4k nodes) | 721 | 891 | 625 | 752 | as divs |

- **Safe trims save ~1% (~10 MiB),** inside the run-to-run spread. They aren't worth a change by themselves; they're
  fine to bundle with other work. Nothing outside the snapshot test reads the `data-committee-*` hooks at print time.
- **Leaving tables saves 26–30%,** but it drops the `Table`/`TR`/`TH`/`TD` tags (StructElems halve). Screen readers
  lose header-aware table navigation, which the maintainer wants to keep (2026-11-20). Tagged printing also got
  5.5–11x slower (roster 1.6 → 9.0 s, legacy 2.4 → 26.3 s). Rejected.
- Removing nodes doesn't track memory: the `::before` variant has 6.4k fewer nodes than divs and uses ~50 MiB *more*.
- Unverified lead: with tagging on, the experiment's Node process reading the PDF stream peaked at 300–430 MiB
  (~96 MiB untagged). Production streams to R2 through `@aws-sdk/lib-storage` `Upload`, which should buffer only
  small parts, so this may be an artifact of the experiment's harness. Check the report server's own Node RSS during a
  large render on the box before relying on it.

**Synthetic tables** (generated pages of 25 rows, 3 runs): peak is linear in elements, ~26 KB per element tagged and
~20 KB untagged, with no separate per-page cost. Class strings and HTML size make no difference (1.9 MB → 0.5 MB HTML,
same peak). The per-element figure holds for elements that carry content (going from 6 to 3 cells per row saved
281 MiB at 134 pages). It does not apply to empty overhead elements, as the real-fixture spacer and `<col>` removals
show.

**Accessibility end to end (checked 2026-11-20):** a roster PDF downloaded from R2 by `verify` (run
`20261121T054923Z-rlnrq2`) keeps the full tag tree: `/MarkInfo` marked, `/Lang (en-US)`, `Table`/`TR`/`TH`/`TD` with
`/Scope` on every header, `H2`/`H3`, and `/DisplayDocTitle` set. Nothing rewrites the bytes: `createPDFStream`
streams to R2, and the report card links straight to the presigned URL. The report HTML has no `lang` attribute
(`utils.ts:235`), so `en-US` is Chrome's default. No PDF/UA checker or screen reader was run (PR #179 ran veraPDF on
merged slices).

**Conclusion:** chunking (option 1, PR #179) remains the fix that keeps tags. DOM trimming is ruled out as a memory
lever.

Reproduce: the experiment scripts were throwaways in agent worktrees, since deleted. The real-fixture run built HTML
through the harness's fixture and call-wiring modules (frozen clock, `TZ=UTC`), measured Chrome's exact peak with
`/usr/bin/time -l` (cross-checked against a 100 ms `ps` sampler, within 2–3%), and counted StructElems as
`/Type /StructElem` occurrences.

## Findings: real report sizes and the merge limit (2026-11-21)

Answers question 1, and sets the page cap that option 3 calls for. The cap is in PR #179; splitting reports into
several files is not needed.

**How big real reports get.** The largest committee report is countywide: `ldCommittees` always prints every
committee (`fetchCommitteeData()` takes no scope), and the countywide roster prints the same set. Each ED has at
most `maxSeatsPerLted` seats (default 4), so the ED count bounds the report. Local DB (it may lag prod), active term:

| | Rows | Pages (estimated, ~24 rows per page as in the 800x4 fixtures) |
| --- | --- | --- |
| Active members countywide | 1,423 across 431 EDs | ~60–65 |
| Every seat in all 659 EDs filled | 2,636 | ~110–120 |
| Largest town (Rochester) | 470 | |

Confirming against prod needs a read-only count of active memberships and EDs for the active term. The 800x4
fixtures (3,200 rows, 134 pages) are bigger than anything the data allows.

**Where the merge breaks.** Slicing bounds Chrome per slice. What grows with report size is node during the merge,
which holds every part plus the whole merged document. Measured on the box with a standalone sweep: pure node,
the service's `--max-old-space-size=384`, N copies of one real 20-page tagged legacy slice, every part held as
`generatePDFAndUpload` holds them, and system memory sampled every 100 ms. The service ran alongside. Idle: 583 MiB
available, 97 MiB of swap in use.

| Pages | Heap | RSS | Merge time | Min MemAvailable | Max swap |
| --- | --- | --- | --- | --- | --- |
| 140 | 118 MiB | 203 MiB | 5.1 s | 424 MiB | 97 MiB |
| 200 | 173 | 270 | 7.7 s | 385 | 98 |
| 300 | 237 | 345 | 9.7 s | 316 | 102 |
| 400 | 301 | 398 | 12.7 s | 260 | 104 |
| 500 | 341 | 450 | 22.3 s | 207 | 104 |
| 560 | 363 | 470 | 20.5 s | 175 | 105 |
| 600 | out of heap | | | | |

- The heap cap is what limits the merge, not box RAM. Swap stays flat up to 560 pages. Local macOS agreed on the
  heap (fails between 560 and 620 pages).
- From ~500 pages the merge slows from GC pressure near the cap.
- Inside the service, the merge shares the 384 MB heap with the service's own heap, so it would fail somewhat below
  560 pages.
- Not covered: a merge running next to another job's Chrome under `QUEUE_CONCURRENCY = 2`. A 300-page merge
  (~345 MiB) plus a slice's Chrome (~450 MiB) would exceed the idle box. Options 2 and 6 cover that, not the cap.

**Decision: cap committee PDFs at 300 pages** (`COMMITTEE_REPORT_MAX_PAGES`, PR #179). That uses ~62% of the heap
cap and leaves the box ~300 MiB available. It is 2.5x a fully seated county. Above the cap, the job fails before
Chrome starts. The failure message says to download XLSX or narrow the roster to a jurisdiction. That message
reaches the frontend through the failure webhook.

## Findings: on the box after #178 and #179 (2026-11-22)

PR #179 was deployed at `1d53745f`. Full Chrome only, `--single-process`, medians of 3 repetitions. Three measured
runs separate the two changes:

- `20261121T022842Z-ryqmd4`: `af3fe0f9`, neither fix.
- `20261121T054923Z-rlnrq2`: `1032ac09`, #178 only (no shadow, so pages are no longer rasterized).
- `20261122T042305Z-zrq5wq`: `1d53745f`, #178 and #179 (20-page slices, one fresh Chrome per slice, merged).

Columns are "roster / legacy":

| 800x4 fixtures | Chrome tree peak | Worker node peak | Min MemAvailable | Max swap during render | Render time |
| --- | --- | --- | --- | --- | --- |
| Neither fix | 652 / 719 MiB | | 65 / 26 MiB | 356 / 570 MiB | 52.7 / 61.0 s |
| #178 only | 685 / 765 | 165 / 218 | 81 / 36 | 350 / 472 | 13.3 / 17.2 s |
| #178 + #179 | **427 / 461** | 203 / 259 | **311 / 262** | **flat at idle (135 / 137)** | 19.2 / 25.7 s |

- **#178 made large reports fast, and #179 fixed their memory.** With #178 alone, renders were ~4x faster, but
  the box was still almost out of RAM and swapping. #179 cuts the Chrome peak by ~260–300 MiB and stops the paging.
- **Slicing costs ~6–8 s per 134-page report** on the box: about 7 Chrome launches plus the merge. A real
  countywide report (~60–65 pages, 4 slices) should pay roughly half that.
- **The large reports now peak only slightly above a typical one.** Sliced 800x4 Chrome peaks are 427 / 461 MiB.
  The 2- to 19-page reports peak at 353–412 MiB, unchanged by #179 (they print as a single HTML).
- **The merge adds ~40 MiB to node** (203 / 259 MiB vs 165 / 218), and the harness max reached 632 MiB on legacy.
  For the "unverified lead" above: the worker's node stays at 110–260 MiB, nowhere near the experiment's 300–430 MiB.
- **The idle box had ~90–120 MiB less available during `zrq5wq`** (per-fixture medians: 536–581 MiB vs 652–668 MiB in `rlnrq2`). The headroom gain
  above is therefore understated, not overstated.
- **No regressions.** The plain full run (`20261122T044810Z-hz8u5x`, all 34 fixtures) and the measured run's
  9 renders matched every approved baseline in page count, text and 144-dpi pixels. Neither run had OOM events or
  service restarts. The LLM review of `hz8u5x` found nothing on any of its 389 pages; after it, all 34 renders
  pass. On both 800x4 fixtures, every slice boundary (20/21 … 120/121) continues the ED and member sequence
  and the "Page N of 134" numbering, and each slice-start page has its table header. `pdftotext` confirms it.
  The only open run item is the box's untracked `apps/report-server/logs/`.
- **Still open:**
  - No memory thresholds have been approved yet. `zrq5wq` is the candidate (`approve --thresholds`).
  - Production smoke test: a countywide `ldCommittees` and roster PDF. The logs should show `generating pdf part i
    of N` and `merging pdf parts`, with no `Tagged PDF merge failed`.
  - Options 2 (size-aware concurrency) and 6 (cgroup limit) are still worth doing as guard rails. Two sliced
    reports at once have not been measured.

## Comments

### 2026-11-20

- Wording nit for later: the comment in `apps/report-server/src/__tests__/noRasterizingStyles.test.ts` (PR #178) says
  Chrome "turns the whole element into images". The evidence shows only the shadow layer became full-page images; the
  text stayed vector (`pdftotext` output was identical before and after). Reword it the next time that file is touched.
- Guarding the PDFs' accessibility tags is ticket 30.
