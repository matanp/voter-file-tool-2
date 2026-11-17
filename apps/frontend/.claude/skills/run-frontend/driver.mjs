// Screenshot pages of the running frontend at several widths, signed in via a session token.
//
//   node driver.mjs --token <tok> [--out DIR] [--sizes 375,768,1280] [--full] [--steps file.mjs] <path>...
//
// For each path and width: load it, measure document scrollWidth/clientWidth (prints "OVERFLOW" when
// the page is wider than the viewport), save <out>/<slug>-<width>.png. With --steps, after loading it
// calls the file's default export: async (page, { width, snap }) => {...}; snap(name) saves
// <out>/<name>-<width>.png and logs overflow at that moment.
//
// Needs playwright-core installed in $PW_DIR (default $TMPDIR/run-frontend-pw) and a Playwright
// Chromium in the ms-playwright cache (or CHROME_PATH). See SKILL.md.
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = { out: join(tmpdir(), 'run-frontend-shots'), sizes: '375,768,1280', base: 'http://localhost:3000', paths: [] };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--full') opt.full = true;
  else if (a.startsWith('--')) opt[a.slice(2)] = args[++i];
  else opt.paths.push(a);
}
if (!opt.token || !opt.paths.length) {
  console.error('usage: node driver.mjs --token <tok> [--out DIR] [--sizes 375,768,1280] [--full] [--steps file.mjs] <path>...');
  process.exit(1);
}

const pwDir = process.env.PW_DIR ?? join(tmpdir(), 'run-frontend-pw');
const pwEntry = join(pwDir, 'node_modules/playwright-core/index.mjs');
if (!existsSync(pwEntry)) {
  console.error(`playwright-core not found in ${pwDir}. Run: mkdir -p ${pwDir} && npm --prefix ${pwDir} i playwright-core@1.59.0`);
  process.exit(1);
}
const { chromium } = await import(pathToFileURL(pwEntry).href);

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  for (const cache of [join(homedir(), 'Library/Caches/ms-playwright'), join(homedir(), '.cache/ms-playwright')]) {
    if (!existsSync(cache)) continue;
    for (const d of readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
      for (const rel of [
        'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        'chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        'chrome-linux64/chrome', 'chrome-linux/chrome',
      ]) if (existsSync(join(cache, d, rel))) return join(cache, d, rel);
    }
  }
  console.error('No Playwright Chromium found. Run: npx playwright@1.59.0 install chromium  (or set CHROME_PATH)');
  process.exit(1);
}

const steps = opt.steps ? (await import(pathToFileURL(resolve(opt.steps)).href)).default : null;
mkdirSync(opt.out, { recursive: true });
const browser = await chromium.launch({ executablePath: findChrome() });
const overflow = (p) => p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
const report = (label, [sw, cw]) => console.log(`${label}  ${sw}/${cw}${sw > cw ? '  OVERFLOW' : ''}`);

try {
  for (const path of opt.paths) {
    const slug = path.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/gi, '-') || 'home';
    for (const width of opt.sizes.split(',').map(Number)) {
      const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 812 : width < 1024 ? 1024 : 800 } });
      await ctx.addCookies([{ name: 'authjs.session-token', value: opt.token, domain: new URL(opt.base).hostname, path: '/' }]);
      const page = await ctx.newPage();
      // First hit of a route compiles it in next dev; can take 30s+.
      await page.goto(opt.base + path, { waitUntil: 'networkidle', timeout: 180000 });
      await page.waitForTimeout(1000);
      const file = join(opt.out, `${slug}-${width}.png`);
      await page.screenshot({ path: file, fullPage: !!opt.full });
      report(`${file}`, await overflow(page));
      if (steps) {
        const snap = async (name) => {
          const f = join(opt.out, `${name}-${width}.png`);
          await page.screenshot({ path: f, fullPage: !!opt.full });
          report(f, await overflow(page));
        };
        await steps(page, { width, snap });
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
