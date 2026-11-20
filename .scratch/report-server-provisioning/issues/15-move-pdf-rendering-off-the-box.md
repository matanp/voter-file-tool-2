# 15 - Move PDF rendering off the box, or stop using a browser

Status: needs-triage
Type: research
Blocked by: 08, 09, 12

## Why

Chrome is most likely the biggest memory user during a report. If tickets 09 and 12 still leave a single report
pushing the box deep into swap (measured as in ticket 08), the remaining fix is to stop running Chrome on the box.

## Options

1. **Cloudflare Browser Rendering.** The project already uses Cloudflare (R2, and `wrangler` is under `infrastructure/`).
   Browser Rendering supports Puppeteer through `@cloudflare/puppeteer`, from a Worker. The report server would send the
   rendered HTML and get a PDF back, or the Worker could write it straight to R2.
   - Pros: the code stays close to what it is now, and Chrome is off the box.
   - Cons: a paid dependency with usage limits, and the report HTML (voter data) goes to another processor, so check
     whether that's acceptable for this data. Tailwind CSS and fonts must be inlined or reachable from the Worker.
2. **A non-browser PDF library,** for example `@react-pdf/renderer` (the reports are already React).
   - Pros: no browser anywhere, and much less memory.
   - Cons: a rewrite of every PDF template, because react-pdf has its own layout primitives, not HTML and Tailwind. Every
     layout must be re-checked against `.scratch/report-layout-verification.md`, and multi-page tables and page
     breaks behave differently.
3. **Do nothing:** if 09–12 are enough.

## To answer

- Cloudflare Browser Rendering's current pricing and limits, and whether sending voter data to it is acceptable.
- Rough effort to port one representative PDF (the Committee Roster) to react-pdf, perhaps as a throwaway prototype.
- A recommendation, with the ticket 08 numbers that justify it.

## Comments
