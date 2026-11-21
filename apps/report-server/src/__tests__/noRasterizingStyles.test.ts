import fs from 'fs';
import path from 'path';

/**
 * Chrome can't print a box-shadow as vectors, so it turns the whole element into images. One
 * Tailwind `shadow` on CommitteeReport's page div made every page two 300 dpi images: the
 * 134-page roster went from 5 MB to 19 MB, and on the 1 GB box page.pdf() took 46-49 s with
 * Chrome's memory near the box's limit (ticket 24). Report components render only to PDF, so
 * they never need these styles.
 */
const COMPONENTS_DIR = path.join(__dirname, '..', 'components');
// A Tailwind shadow token with any variants (`print:`, `[&>*]:`), `!` and suffix (`-md`,
// `-[0_0_2px_rgba(0,0,0,.5)]`), or a CSS / inline-style box-shadow or text-shadow.
const RASTERIZING =
  /(?:^|[\s"'`])(?:[^\s"'`:]+:)*!?(?:drop-)?shadow(?:-[^\s"'`]*)?(?=[\s"'`$]|$)|(?:box|text)Shadow|(?:box|text)-shadow/;

describe('report components', () => {
  const files = fs.readdirSync(COMPONENTS_DIR).filter((f) => f.endsWith('.tsx'));

  it('finds the components to check', () => {
    expect(files).toContain('CommitteeReport.tsx');
  });

  it.each(files)('%s uses no shadow styles that Chrome rasterizes in PDFs', (file) => {
    const source = fs.readFileSync(path.join(COMPONENTS_DIR, file), 'utf8');
    const hits = source
      .split('\n')
      .flatMap((line, i) => (RASTERIZING.test(line) ? [`${i + 1}: ${line.trim()}`] : []));
    expect(hits).toEqual([]);
  });
});
