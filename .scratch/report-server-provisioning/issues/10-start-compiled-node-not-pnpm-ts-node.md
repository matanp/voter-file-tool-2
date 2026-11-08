# 10 - Start the report server as compiled JavaScript under plain node

Status: ready-for-agent
Type: task

## Why

Today PM2 runs `apps/report-server/start.sh`, which runs `pnpm start`. That runs:

1. `prestart`: `tsc` builds of `voter-import-processor`, `shared-validators` and `shared-prisma`,
2. `build:css`: the Tailwind build,
3. `node -r ts-node/register src/index.ts`.

So every PM2 restart, including a crash restart, starts pnpm, three `tsc` runs and Tailwind before the server is up.
That's a memory spike exactly when the box is already in trouble. Afterwards ts-node keeps the TypeScript compiler in
memory: about 195Mi RSS idle (ticket 04). This also covers the "have PM2 run node directly" item left open in ticket 03.

## Fix

- Add a `build` script to `apps/report-server/package.json` that compiles `src/` (including the `.tsx` report
  components) to `dist/` with `tsc` and runs `build:css`. Check how the server finds `public/tailwind.css`, the fonts and
  the icons at runtime, so the paths still work from `dist/`.
- Add `"start:prod": "node dist/index.js"`. Keep `start` / `dev` as they are for local work, or move them over to
  the new scripts.
- Run the build at build time: in `infrastructure/scripts/03-build-packages.sh` after the shared packages, and in
  `scripts/deploy-lightsail.sh` before the PM2 restart.
- `ecosystem.config.js`: run node directly, with no `start.sh` and no pnpm. Either `script: 'dist/index.js'` with
  `interpreter` set to the nvm node binary (resolve the path at provisioning time, e.g. from `nvm which default`),
  or keep a tiny wrapper that only loads nvm and `exec node dist/index.js`. Make sure `.env` is still loaded, since it
  is read through `dotenv` from the cwd today.
- Delete the Tailwind ownership workaround in `start.sh` if `start.sh` goes away.
- Make sure `tsconfig` resolves the workspace packages from their built `dist/`, not their sources, at runtime.

## Acceptance

- `pm2 restart report-server` starts no `pnpm`, `tsc`, `tailwindcss` or `ts-node` process. Check with `ps` during the restart.
- Idle RSS of the server's node process is clearly below the ~195Mi ts-node baseline. Target: under 120Mi, compared with ticket 08.
- A PDF report and an xlsx report both still generate correctly, with styles and fonts, after a fresh recreate.
- `pnpm dev` still works locally.

## Comments

### 2026-11-08: implemented on branch `report-server-compiled-node` (not pushed)

Changes:
- `apps/report-server/package.json`: `build` (`clean`, `tsc -p tsconfig.build.json`, `build:css`), `clean`, `start:prod`
  (`node dist/index.js`); `main` now points at `dist/index.js`. `start`, `prestart` and `dev` are unchanged for local work.
- New `apps/report-server/tsconfig.build.json`: compiles `src/**/*.ts` and `src/**/*.tsx` and leaves out `__tests__`.
- `ecosystem.config.js`: `script: 'dist/index.js'`, `interpreter: process.execPath` (the nvm node that runs
  `pm2 start`; PM2 stores the absolute path). `cwd` is unchanged, so dotenv still reads `.env` from it.
- Deleted `start.sh` and its Tailwind ownership workaround, plus the `chmod +x start.sh` block in `06-setup-pm2.sh`.
- `03-build-packages.sh`: builds the report-server after the shared packages and checks that `dist/index.js` and
  `public/tailwind.css` exist.
- `deploy-lightsail.sh`: builds the report-server after `build:packages`, inside the abort trap. Then it runs
  `pm2 delete` + `pm2 start apps/report-server/ecosystem.config.js` + `pm2 save` instead of `pm2 restart`, because
  `pm2 restart` reuses the stored script and interpreter (here, the old `start.sh`) and would miss the config change.
  There were no `prisma generate` lines left in it to leave alone: ticket 16 already removed them.
- `DEPLOYMENT_GUIDE.md`: the manual steps build the report-server and start it with `pnpm run start:prod`.

Runtime paths: `express.static(path.join(__dirname, '../public'))` points at `apps/report-server/public` from `dist/`
just as it did from `src/`. Puppeteer loads `tailwind.css` from the server over HTTP. There are no font files
(Chrome's system Arial is embedded in the PDFs). The icons are `.tsx` components compiled into `dist/icons`. Workspace
packages resolve through their `package.json` `main`/`exports` to `dist/` (there are no tsconfig `paths`), so
compiled `require`s load the built packages.

Verified locally (macOS, Node 25.6, local dev Postgres):
- `pnpm --filter node-pdf-generation run build` is clean (about 3s), and `dist/` holds every `.ts`/`.tsx` module.
- I started `node dist/index.js` (PORT 18080) with a preload that writes uploads to local files instead of R2, and a
  local listener for the callback. I posted gzipped `/start-job` requests for a Brighton committee roster as PDF and
  as xlsx, plus a Brighton sign-in sheet PDF. All three called back with `success: true`. The PDFs embed
  Arial/Arial-Bold/Arial-Italic, and the rendered pages show the Tailwind styling.
- I ran the same three jobs on the old `node -r ts-node/register src/index.ts` path. All 26 rasterized PDF pages are
  byte-identical, `pdftotext` output is identical, and the xlsx worksheet and styles XML are identical.
- `pnpm dev --port 13000`: nodemon + ts-node report server served `/tailwind.css` on 13001, and the frontend was
  ready on 13000.
- `pnpm test` in report-server: 143/143 pass. `bash -n` passes on the three changed shell scripts.
- Idle RSS locally: 141Mi compiled vs 654Mi under ts-node (macOS/arm64, so not comparable to the box; only the ratio
  is meaningful).

Still needs the real box:
- `ps` during `pm2 restart report-server` shows no `pnpm`, `tsc`, `tailwindcss` or `ts-node`.
- Idle RSS under 120Mi (compare with tickets 04/08).
- PDF + xlsx with styles and fonts after a fresh recreate (`00-setup-all.sh` path).
- The first deploy of this change: `pm2 save` should replace the dump's `start.sh` entry, so check that a reboot
  resurrects `dist/index.js`. If that first deploy aborts before the build, the trap's `pm2 restart` will fail
  because `start.sh` is gone. Recover with `pm2 delete report-server && pm2 start apps/report-server/ecosystem.config.js`
  after a build.
