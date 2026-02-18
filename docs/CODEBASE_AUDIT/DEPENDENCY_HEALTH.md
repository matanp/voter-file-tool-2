# Dependency Health Audit

## Executive Summary

Analysis of dependency freshness, known vulnerabilities, and dependency hygiene across the pnpm monorepo workspace. The monorepo contains: `apps/frontend` (Next.js 15), `apps/report-server` (Express + Puppeteer), and 4 shared packages (`shared-prisma`, `shared-validators`, `voter-import-processor`, `xlsx-tester`).

---

## Known Vulnerabilities (`pnpm audit`)

### HIGH Severity

#### 1. `xlsx@0.18.5` -- Prototype Pollution (GHSA-4r6h-8v6p-xvw6) [P1]
- **Affected:** apps/frontend, apps/report-server, packages/xlsx-tester
- **Patched:** `<0.0.0` (no patch available -- SheetJS moved to a different distribution model)
- **Risk:** Prototype pollution via crafted spreadsheet files. Since the report-server processes user-triggered XLSX generation, this is exploitable in theory.
- **Recommendation:** Evaluate migration to `exceljs` or SheetJS Pro. See "xlsx Library -- No Upgrade Path" below.

#### 2. `xlsx@0.18.5` -- ReDoS (GHSA-5pgg-2g8v-p4x9) [P1]
- **Same package, second vulnerability.** Regular expression denial of service via crafted input.
- **Risk:** Could cause the report-server to hang during XLSX processing.

#### 3. `tar-fs@3.1.0` -- Symlink Validation Bypass (GHSA-vj76-c3g6-qr5v) [P2]
- **Affected:** apps/report-server via puppeteer@23.11.1 > @puppeteer/browsers > tar-fs
- **Patched:** `>=3.1.1`
- **Risk:** Only exploitable if an attacker controls the tarball being extracted. Used internally by Puppeteer for browser downloads. Low exploitability.
- **Recommendation:** Upgrade Puppeteer to a version that pulls `tar-fs@>=3.1.1`.

#### 4. `glob@10.4.5` -- Command Injection via CLI (GHSA-5j98-mcp5-4vw2) [P3]
- **Affected:** Transitive dep of tailwindcss, jest (33 paths)
- **Patched:** `>=10.5.0`
- **Risk:** Only exploitable via the `glob` CLI with `--cmd` flag, not via the programmatic API. No production risk.
- **Recommendation:** Will resolve when parent deps (tailwindcss, jest) update. No action needed.

#### 5. `next@15.5.7` -- DoS with Server Components (GHSA-mwv6-3258-q52c) [P1]
- **Affected:** apps/frontend
- **Patched:** `>=15.5.8`
- **Risk:** Denial of service affecting Server Components. This is the core rendering path of the application.
- **Recommendation:** Bump `next` to `>=15.5.8` immediately. This is a patch-level update.

---

## Outdated Dependencies

### Major Version Behind (Breaking Changes Expected)

| Package | Current | Latest | App | Priority |
|---|---|---|---|---|
| `@prisma/client` + `prisma` | 5.15.0 | 7.4.0 | All | P2 |
| `@sentry/nextjs` | 8.55.0 | 10.38.0 | frontend | P2 |
| `next` | 15.5.7 | 16.1.6 | frontend | P2 |
| `express` | 4.21.2 | 5.2.1 | report-server | P3 |
| `puppeteer` | 23.11.1 | 24.37.3 | report-server | P2 |
| `zod` | 3.25.76 | 4.3.6 | shared-validators, frontend, report-server | P2 |
| `eslint` | 8.57.1 | 10.0.0 | frontend | P3 |
| `@typescript-eslint/*` | 7.18.0 | 8.55.0 | frontend | P3 |
| `date-fns` | 3.6.0 | 4.1.0 | frontend | P3 |
| `tailwindcss` | 3.4.17 | 4.1.18 | frontend, report-server | P2 |
| `tailwind-merge` | 2.6.0 | 3.4.0 | frontend | P3 |
| `react-day-picker` | 8.10.1 | 9.13.2 | frontend | P3 |
| `lucide-react` | 0.372.0 | 0.564.0 | frontend | P3 |
| `posthog-js` | 1.203.1 | 1.347.2 | frontend | P2 |
| `chalk` | 4.1.2 | 5.6.2 | xlsx-tester | P3 |
| `commander` | 12.1.0 | 14.0.3 | xlsx-tester | P3 |
| `react` / `react-dom` (report-server) | 18.3.1 | 19.2.4 | report-server | P2 |

### Minor/Patch Updates Available

| Package | Current | Latest | Notes |
|---|---|---|---|
| `@aws-sdk/client-s3` | 3.884.0 | 3.990.0 | Minor updates, security patches |
| `@aws-sdk/lib-storage` | 3.884.0 | 3.990.0 | Minor |
| `@aws-sdk/s3-request-presigner` | 3.884.0 | 3.990.0 | Minor |
| `@auth/prisma-adapter` | 2.10.0 | 2.11.1 | Patch |
| `ably` | 2.12.0 | 2.17.1 | Minor |
| `typescript` | 5.9.2 | 5.9.3 | Patch |
| `jest` + `jest-environment-jsdom` | 30.1.x | 30.2.0 | Minor |
| `dotenv` | 17.2.2 | 17.3.1 | Minor |
| `react` / `react-dom` (frontend) | 19.1.1 | 19.2.4 | Minor |
| `@testing-library/react` | 16.3.0 | 16.3.2 | Patch |
| `@testing-library/jest-dom` | 6.8.0 | 6.9.1 | Minor |
| `prettier` | 3.6.2 | 3.8.1 | Minor |
| `cmdk` | 1.0.0 | 1.1.1 | Minor |
| `@vercel/speed-insights` | 1.2.0 | 1.3.1 | Minor |
| `nodemon` | 3.1.10 | 3.1.11 | Patch |
| `autoprefixer` | 10.4.21 | 10.4.24 | Patch |

### Deprecated Packages

| Package | Status | Recommendation |
|---|---|---|
| `@types/commander` | Deprecated | Commander now ships its own types. Remove this devDependency from xlsx-tester. |
| `@types/eslint` | 8.56.12 (behind v9) | Will be addressed with ESLint 10 migration. |

---

## Dependency Hygiene Issues

### React Version Mismatch Between Apps [P2]

- `apps/frontend`: React 19.1.1
- `apps/report-server`: React 18.3.1

The report-server uses React for server-side rendering of PDF/report components via `react-dom/server`. Having different React major versions in the same monorepo can cause type conflicts and subtle rendering differences between the search UI preview and the generated PDF.

**Recommendation:** Upgrade report-server to React 19 to match frontend.

### `xlsx` Library -- No Upgrade Path [P1]

The `xlsx` npm package (SheetJS community edition) is effectively abandoned on npm. Versions `>=0.19.3` are not published to npm (SheetJS moved to a paid model). The "patched version" for the prototype pollution CVE is `<0.0.0` -- meaning there is no fix available via npm.

**Options:**
1. **Migrate to `exceljs`** (MIT license, actively maintained, different API) -- recommended
2. **Use SheetJS Pro** (paid license)
3. **Accept the risk** and add input sanitization around XLSX parsing -- least recommended

### `@t3-oss/env-nextjs` Very Outdated [P2]

Current: 0.9.2, Latest: 0.13.10. This is the env validation library. Later versions have better Next.js 15 support and bug fixes.

### `next-themes` Outdated [P3]

Current: 0.3.0, Latest: 0.4.6. Theme support is currently commented out in the layout, so this is low priority. If dark mode is planned, update first.

---

## Unnecessary Dependencies

### `xlsx` in `apps/frontend` [P2]

The frontend `package.json` includes `xlsx@0.18.5` as a direct dependency. However, XLSX generation is handled entirely by the report-server. If `xlsx` is not actually imported in any frontend source file, it should be removed to eliminate the vulnerability surface.

**Recommendation:** Check if `xlsx` is imported in the frontend. If not, remove it.

### `@types/commander` in `xlsx-tester` [P3]

Commander ships its own TypeScript types since v9. The `@types/commander` package is deprecated and unnecessary.

---

## Version Pinning

### Positive Patterns
- `packageManager: "pnpm@8.15.7"` is pinned consistently in root and report-server package.json
- `pnpm-lock.yaml` exists (lockfile present)
- Most dependencies use `^` ranges (standard for applications)

### Concerns
- `docker-compose.yml` uses `postgres:latest` instead of a pinned version (e.g., `postgres:15`). A Postgres major version upgrade could break the local dev database.
- No `.nvmrc` file -- Node.js version (`22`) is hardcoded in multiple deployment scripts with no single source of truth.

---

## Recommended Update Strategy

### Immediate (This Sprint)

1. Bump `next` from 15.5.7 to >=15.5.8 (patch, fixes DoS CVE)
2. Evaluate `xlsx` replacement or mitigation
3. Remove `xlsx` from frontend if unused
4. Remove `@types/commander` from xlsx-tester
5. Bump `@aws-sdk/*` packages (minor updates)
6. Add `.nvmrc` with `22` at repo root
7. Pin `postgres:15` in docker-compose.yml

### Near-Term (Next 2-4 Weeks)

1. Upgrade Puppeteer 23 -> 24 (fixes tar-fs CVE transitively)
2. Upgrade `@t3-oss/env-nextjs` to 0.13.x
3. Upgrade report-server React 18 -> 19
4. Upgrade `posthog-js` (very far behind: 1.203 -> 1.347)
5. Bump minor/patch updates (typescript, jest, ably, dotenv, react)

### Planned (When Ready for Breaking Changes)

1. **Prisma 5 -> 7** (major migration, new query engine)
2. **Zod 3 -> 4** (API changes in schema definition)
3. **Tailwind CSS 3 -> 4** (config format changes, affects both apps)
4. **ESLint 8 -> 10 + typescript-eslint 8** (flat config migration)
5. **Express 4 -> 5** (minor breaking changes)
6. **Sentry 8 -> 10** (SDK restructuring)
7. **date-fns 3 -> 4**
8. **Next.js 15 -> 16** (evaluate when stable)
