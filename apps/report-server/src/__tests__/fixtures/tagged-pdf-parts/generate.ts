/**
 * Regenerates the Chrome-printed PDFs pdfMerge.test.ts merges. Jest mocks Puppeteer, so the
 * test reads these files instead of launching Chrome. Rerun after a Puppeteer (Chrome) upgrade:
 *
 *   pnpm --filter node-pdf-generation run build:css
 *   cd apps/report-server && npx ts-node src/__tests__/fixtures/tagged-pdf-parts/generate.ts
 *
 * It prints a synthetic 5-page committee report twice, with the production launch and PDF
 * options: whole.pdf in one browser, and part-0..2.pdf as generateCommitteeReportHTMLChunks
 * slices of 2 pages, each in a fresh browser (so, like production, the parts reuse Chrome's
 * element IDs). It does this for the legacy layout and for the roster with every column
 * (files prefixed `roster-`).
 */
import fs from 'fs';
import http from 'http';
import path from 'path';
import puppeteer from 'puppeteer';
import { COMMITTEE_ROSTER_COLUMN_ORDER } from '../../../committeeRosterConfig';
import { syntheticCommittees } from '../../helpers/syntheticCommittees';

const PORT = 8798;
process.env.PORT = String(PORT);

async function main() {
  const { generateCommitteeReportHTML, generateCommitteeReportHTMLChunks } = await import('../../../utils');
  const css = fs.readFileSync(path.resolve(__dirname, '../../../../public/tailwind.css'));
  const server = http.createServer((req, res) => {
    res.writeHead(req.url === '/tailwind.css' ? 200 : 404, { 'content-type': 'text/css' });
    res.end(req.url === '/tailwind.css' ? css : '');
  });
  await new Promise<void>((resolve) => server.listen(PORT, '127.0.0.1', resolve));

  // A fixed clock keeps the footer date, and so the PDFs, stable between regenerations.
  const RealDate = Date;
  const fixed = RealDate.parse('2026-03-02T15:00:00.000Z');
  globalThis.Date = class extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(fixed);
      else super(...(args as [string]));
    }
    static now() {
      return fixed;
    }
  } as DateConstructor;
  const report = syntheticCommittees(5, 2, 2);
  // Legacy (no columns) keeps the original file names; roster (every column) gets a prefix.
  const modes = [
    { prefix: '', columns: undefined },
    { prefix: 'roster-', columns: [...COMMITTEE_ROSTER_COLUMN_ORDER] },
  ].map(({ prefix, columns }) => ({
    prefix,
    whole: generateCommitteeReportHTML(report, columns),
    parts: generateCommitteeReportHTMLChunks(report, columns, 2),
  }));
  globalThis.Date = RealDate;

  const print = async (html: string) => {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      return await page.pdf({ format: 'Letter', landscape: true, printBackground: true });
    } finally {
      await browser.close();
    }
  };
  for (const { prefix, whole, parts } of modes) {
    fs.writeFileSync(path.join(__dirname, `${prefix}whole.pdf`), await print(whole));
    for (const [i, html] of parts.entries()) {
      fs.writeFileSync(path.join(__dirname, `${prefix}part-${i}.pdf`), await print(html));
    }
  }
  server.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
