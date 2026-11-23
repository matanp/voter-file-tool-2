> **Note (2026-11-21):** this review was taken at `1032ac09`. During the review, #180, #182 and #184 merged ui-page-consistency 01–03 (heading semantics, `PageContainer` width caps, "Committees" naming), and the global header moved to `apps/frontend/src/app/components/header.tsx`. The nav label "Committee List" quoted below is now "Committees"; the `header.tsx` line numbers are stale. The findings were re-checked against `dcedbdcc`; see [../spec.md](../spec.md).

# App shell and first impressions — review

Shots: `shots/{dev,leader}/` plus extras in `shots/extra-shell/` (access-denied, 404, /error at 375/1280).

## 1. Top makeover candidates

### A. Global top bar → quiet app bar (Effort M, Impact H)
**What it is for:** the main nav on every page (Record Search, Committee List, Reports, Admin) plus the profile.
**At a glance:** it is the loudest thing on every screen. You get 64px-tall gray buttons in 20px bold type, and the active item is a saturated green slab (`header.tsx:75-76, 117`). It has no product name or logo. In prod the left slot is an empty spacer (`header.tsx:153-162`). "View Profile" is a third colour, slate-900 (`manageProfile.tsx:53`). Right under it, the workspace header (`CommitteeWorkspaceHeader.tsx:34-37`) is 18px semibold on white. The nav shouts and the page whispers, so the workspace looks pasted under someone else's chrome (`dev/committees-detail-1280.png`, `dev/admin-1280.png`). Admin adds a second, green-highlighted side rail (`AdminSidebar.tsx:65`, `admin-1280.png`). On phone it adds a second hamburger, which floats at the bottom-left (`AdminSidebar.tsx:137`). The phone menu (`header-menu-open-375.png`) is fine as a list, but it uses `text-lg font-semibold` rows and a solid green active row.
**Recommendation: keep a top bar, don't add a global side rail.** There are only 3–4 sections, Leaders are mostly on phones, and the workspace already uses the horizontal space for its own list→detail split. A global rail would squeeze it. Admin keeps its section rail, restyled to match.
```
1280 ┌──────────────────────────────────────────────────────────────────┐ 48px, white, 1px border-b
     │ ◧ Open Source Politics   Search  Committees  Reports  Admin   [DEV DB] (MP)▾ │
     │                                  ─────────                         │ active = 2px underline + fg text
     └──────────────────────────────────────────────────────────────────┘ inactive = text-sm muted-fg
375  ┌──────────────────────────────┐
     │ ◧ OSP                (MP) ☰  │  48px; ☰ opens a sheet with the nav + profile + (Admin sections)
     └──────────────────────────────┘
```
- Height drops from about 88px to 48px. On a 375×812 phone that gives back about 5% of the screen to the list on every page.
- Nav items become `text-sm font-medium` text links. The active item gets foreground colour and an underline (or a neutral `bg-muted` pill). Keep green only for real status (filled seats, success).
- Profile becomes an avatar or initials button with a dropdown (name, role, acting-as, sign out). "View Profile" as a big dark button is too heavy.
- The DEV DB badge moves next to the avatar and shrinks. PROD DB stays red.
- Rename "Committee List" to "Committees" (`header.tsx:57`) to match the page title. "Record Search" could become "Voters".
- On phone, fold the Admin section list into the same ☰ sheet as a sub-group, then drop the floating bottom-left button (`AdminSidebar.tsx:137-150`). It also clashes with toasts and the dev indicator.
- Side benefit: a fixed-height bar lets `useHeightBelowNav` (`useHeightBelowNav.ts:8-21`, which measures `<nav>` at runtime) become a CSS variable.

### B. Home page `/` → a signed-in "today" page (Effort M, Impact H)
**What it is for:** the landing page after sign-in, for every user.
**At a glance:** it is a marketing page for people who already signed in: "Political Campaign Tool / BETA", a 48px hero, a three-card feature list with checkmarks ("Export results to Excel"), "Get Started" tiles that repeat the nav, and a "Secure • Reliable • Professional" footer (`page.tsx:36-44`, `HeroSection.tsx:25-32`, `QuickActions.tsx:62-64`). It looks the same for a Leader and a Developer. On a phone the only useful thing (the tiles) starts about 1,500px down (`leader/home-375.png`). Nothing about *my* committees, pending items or reports shows up.
**Sketch.** It borrows the workspace header and seat-dot rows. Its cards are not a split pane, because home is a jump-off page and not a list you work through.
```
Good evening, Name                                    (no hero)
LD 17 · 12 committees · 5 open seats · 1 pending       ← one-line stat summary, scoped
[ Find a voter…                         🔍 ]           ← search field straight into /recordsearch

My committees                               View all ›
 ED 1   ●●●●  4/4
 ED 7   ●●●○  3/4   1 pending
 ED 12  ●●○○  2/4                                      ← top 5 by open seats, links into workspace detail
Recent reports                              Reports ›
 Committee roster · Nov 18 · Ready ⬇
 Sign-in sheet    · Nov 12 · Ready ⬇
Admin only:  Pending review (2) · Discrepancies (4)    ← count chips linking into the review queues
```
- Signed-out users keep a much shorter hero: name, one sentence, Sign in.
- Drop FeaturesGrid, the Footer and KeyCapabilities (already commented out).
- Where it doesn't fit: an Admin's scope is countywide, so "My committees" becomes "Needs attention" (most-vacant EDs and queues). Don't put the whole grid on home.

### C. One page-open pattern and a styled set of system states (Effort S–M, Impact H)
**At a glance:** pages open five different ways:
- workspace: `text-lg` semibold, plus a 12px stat line and outline actions on the right (the bar)
- `PageHeader`: `text-2xl` *green* bold, plus a paragraph (`globals.css:64-65`, `PageHeader.tsx:15`)
- admin pages: `text-2xl` black, plus a two-line paragraph (`admin-1280.png`, `admin-users-375.png`)
- requests: `text-lg` (`requests/page.tsx:133`), with a 24px card title under it (`RequestCard.tsx:87`), so the hierarchy is upside down
- home: `text-5xl`

`PageContainer` also paints the page with `bg-primary-foreground` (`PageContainer.tsx:34`). That is a pink tint (355.7 100% 97.3%) meant for text on green buttons, which is why Reports looks pink (`leader/reports-375.png`).
**Proposal:** make one `PageHeader` that matches the workspace header:
```
┌─────────────────────────────────────────────────────────────┐ border-b, px-4 py-2
│ Reports                                   [Refresh] [⋯]     │ h1 text-lg semibold, fg colour
│ 2 generating · 14 ready · last run Nov 18                   │ text-xs muted, the live counts
└─────────────────────────────────────────────────────────────┘
```
- Descriptions like "View and manage your reports…" go away or move behind an ⓘ.
- The stat line carries the information instead, e.g. Users: "3 users · 2 Leaders · 1 pending invite", Requests: "2 committees · 1 submission · 1 reported exit".
- Use the same block for the system states:
  - **Permission denied** is raw unstyled text flush to the left edge (`leader/committees-requests-375.png`, `requests/page.tsx:65`; same in `AdminPageAccessDenied.tsx:4-6` and `authcheck.tsx:27-31`).
  - **404** is the Next default (no `not-found.tsx`; `extra-shell/this-page-does-not-exist-1280.png`).
  - **`/error`** is a full-bleed card with no margin (`error/page.tsx:27`, `extra-shell/error-1280.png`).
  - **`app/error.tsx`** is bare `<h2>`/`<p>` and shows the raw `error.message`.
  - Replace all of these with one `<StatusPanel icon title body action>`, a centred `max-w-md` block styled like `CommitteeEmptyScope.tsx:23-29` (already good). Use it for denied, sign-in needed, 404, error and empty.

## 2. Other findings

| Page | Issue | Evidence | Suggested fix | Effort | Impact |
|---|---|---|---|---|---|
| /committees/requests | Overflows at 375. The column is a fixed `w-96 m-4` (416px), and it is still 384px wide at 1280 with blank space to the right | `dev/committees-requests-375.png`, `-1280.png`; `requests/page.tsx:140,148` | Use `PageContainer` + `max-w-2xl w-full`. Better: show it as the workspace's Pending tab or a list→detail page with committee rows and counts | S (fix) / M (redo) | H |
| /committees/requests | Each request is a big Card ("Committee Membership Request" in 24px). Reported exits use a different, denser card. Two visual languages in one accordion | same shots; `RequestCard.tsx:85-118`, `ExitReportList.tsx` | One compact row style: name · seat · type chip · reported date, with actions in a ⋯ menu or a primary button on the right | M | M |
| Loading states | About 25 different plain-text "Loading…" strings. Only `admin/loading.tsx` and record search use skeletons. No route-level `loading.tsx` outside admin, so navigation looks frozen | grep `Loading...`; `authcheck.tsx:40` renders `<h1>Loading...</h1>`; `access-denied/page.tsx:26` | Add `loading.tsx` for /committees, /reports and /recordsearch using `Skeleton` in the page-header + list shape. For in-pane loading use skeleton rows that match the dot rows | S–M | M |
| Empty states | Bare "No reports found", "No results found." and "No invites found" lines inside big padded cards. No icon, no next step | `leader/reports-375.png` ("No reports found" twice); `ReportsList.tsx:258`; `requests/page.tsx:142` | Use `StatusPanel` (small icon, one line, action button, e.g. "Generate a report") | S | M |
| Toasts | 72 `destructive` and 3 `default` uses, and no success variant, so "Success" shows in plain white. Destructive is a solid red slab. Big `p-6` padding. On phone they slide from the top and cover the header. `TOAST_REMOVE_DELAY = 1000000` | `toast.tsx:19,28-35`; `use-toast.ts:11-12` | Use compact neutral toasts (`p-3 text-sm`) with a coloured left icon (✓ green, ! red). Bottom-centre on phone, above the safe area. Auto-dismiss success after about 4s | S | M |
| Toast copy | Titles are mostly generic: 37× "Error", 15× "Success" | grep `title: "` | Title says what happened ("Report queued", "Member removed"). Add an Undo action where one exists | S | L–M |
| /auth/access-denied | Fine overall. Nests its own `min-h-screen bg-gray-50` under the header, so it scrolls on short screens. "Back to Home" uses a people icon | `extra-shell/auth-access-denied-375.png`; `access-denied/page.tsx:10,32` | Use `StatusPanel` and drop `min-h-screen` | S | L |
| Header (prod) | No brand, and the empty spacer exists only to centre the tabs | `header.tsx:153-162` | Add a wordmark on the left (see A) | S | M |
| Header active state | `isActive: p.includes("record")` would also match any future path containing "record" | `header.tsx:53` | Use `startsWith("/recordsearch")` | S | L |
| Nits | Hero badges duplicate the BETA notice. Home "Get Started" tiles repeat the nav. `admin/loading.tsx` is the only skeleton and its shape (`h-8`, `h-64`) matches no page. The home container is `container py-16`, unlike `PageContainer` | `HeroSection.tsx:12-24`; `QuickActions.tsx`; `admin/loading.tsx:7-12` | Fix as part of A–C | S | L |

## 3. Design-system implications
- **AppBar**: one 48px neutral bar. Text-link nav with an underline active state, avatar menu and env badge. On phone, one sheet that also holds Admin sections.
- **PageHeader v2**: `title`, `stats` (a short list of items joined with " · "), `actions` (outline `sm` buttons plus overflow ⋯). Retire `.primary-header` (green 2xl) and long descriptions.
- **StatusPanel**: icon, title, body, action. Covers empty, denied, sign-in, 404 and error. Base it on `CommitteeEmptyScope`.
- **Skeleton patterns**: header skeleton plus list-row skeleton matching the workspace rows. Add a route `loading.tsx` per section.
- **Toast**: add a `success` variant, compact sizing and bottom placement on phone, and fix the dismiss delay.
- **Colour roles**: green = status and "filled" only. The nav and active states use neutral foreground. Fix the `PageContainer` background (`bg-primary-foreground` → `bg-background` or `bg-muted/30`). Use one primary button colour (now green `--primary` vs slate-900 buttons).
