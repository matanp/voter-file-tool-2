/**
 * Runs inside the pinned comparison image (comparison-image/Dockerfile), never on the box.
 * Uses only Node built-ins and Poppler. For each PDF: page count and sizes, embedded fonts,
 * raw and normalized text per page, a 144 DPI PNG per page, a pixel diff against a reference
 * PDF when one is given, and background colours sampled beside requested words.
 * Pages are rasterized one at a time and their buffers dropped before the next.
 *
 *   node /harness/inspect.js /work/inspect/job.json
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { RASTER_DPI } from './common';
import { classifyColor, diffImages, encodePng, pixelAt, readPpm, type DiffMetrics, type Rgb } from './image';
import { normalizePageText, splitPages } from './text';

export type InspectItem = { id: string; pdf: string; reference: string | null; colorWords: string[]; outDir: string };
export type InspectJob = { items: InspectItem[] };

export type PdfFacts = {
  readable: boolean;
  error?: string;
  pages: number;
  pageSizes: { widthPt: number; heightPt: number }[];
  fonts: { name: string; type: string; embedded: boolean }[];
  normalizedPages: string[];
};

export type PageResult = {
  page: number;
  png: string;
  diff: (DiffMetrics & { png: string | null }) | null;
};

export type ColorObservation = { word: string; page: number; rgb: [number, number, number] | null; color: string };

export type Inspection = {
  id: string;
  candidate: PdfFacts;
  reference: PdfFacts | null;
  pages: PageResult[];
  colorSamples: ColorObservation[];
};

export type ToolVersions = { poppler: string; popplerPackage: string; node: string; os: string };

function tool(cmd: string, args: string[]): { status: number | null; out: string; err: string; buf: Buffer } {
  const r = spawnSync(cmd, args, { maxBuffer: 512 * 2 ** 20 });
  return { status: r.status, out: r.stdout?.toString('utf8') ?? '', err: r.stderr?.toString('utf8') ?? '', buf: r.stdout ?? Buffer.alloc(0) };
}

export function toolVersions(): ToolVersions {
  const v = tool('pdfinfo', ['-v']);
  return {
    poppler: (/pdfinfo version (\S+)/.exec(v.err + v.out)?.[1]) ?? 'unknown',
    popplerPackage: tool('dpkg-query', ['-W', '-f', '${Version}', 'poppler-utils']).out.trim() || 'unknown',
    node: process.version,
    os: fs.existsSync('/etc/os-release') ? (/PRETTY_NAME="([^"]+)"/.exec(fs.readFileSync('/etc/os-release', 'utf8'))?.[1] ?? 'unknown') : 'unknown',
  };
}

function facts(pdf: string, rawTextOut: string | null): PdfFacts {
  const empty: PdfFacts = { readable: false, pages: 0, pageSizes: [], fonts: [], normalizedPages: [] };
  if (!fs.existsSync(pdf)) return { ...empty, error: `missing: ${pdf}` };
  const info = tool('pdfinfo', [pdf]);
  const pages = Number(/^Pages:\s+(\d+)/m.exec(info.out)?.[1] ?? NaN);
  if (info.status !== 0 || !Number.isFinite(pages)) return { ...empty, error: `pdfinfo failed: ${info.err.trim()}` };
  const sizes = tool('pdfinfo', ['-f', '1', '-l', String(pages), pdf]).out;
  const pageSizes = [...sizes.matchAll(/^Page\s+\d+ size:\s+([\d.]+) x ([\d.]+) pts/gm)].map((m) => ({ widthPt: Number(m[1]), heightPt: Number(m[2]) }));
  const fonts = tool('pdffonts', [pdf])
    .out.split('\n')
    .slice(2)
    .filter(Boolean)
    .map((line) => {
      const cols = line.trim().split(/\s+/);
      // name type... encoding emb sub uni object ID: count from the right, since type has spaces.
      return { name: cols[0] ?? '', type: cols.slice(1, cols.length - 6).join(' '), embedded: cols[cols.length - 5] === 'yes' };
    });
  const text = tool('pdftotext', ['-layout', '-enc', 'UTF-8', pdf, '-']);
  if (text.status !== 0) return { ...empty, pages, pageSizes, fonts, error: `pdftotext failed: ${text.err.trim()}` };
  const rawPages = splitPages(text.out, pages);
  if (rawTextOut) {
    fs.mkdirSync(rawTextOut, { recursive: true });
    rawPages.forEach((t, i) => fs.writeFileSync(path.join(rawTextOut, `page-${String(i + 1).padStart(3, '0')}.txt`), t));
  }
  return { readable: true, pages, pageSizes, fonts, normalizedPages: rawPages.map(normalizePageText) };
}

function rasterize(pdf: string, page: number, tmpPrefix: string): Rgb {
  const r = tool('pdftoppm', ['-r', String(RASTER_DPI), '-f', String(page), '-l', String(page), '-singlefile', pdf, tmpPrefix]);
  const file = `${tmpPrefix}.ppm`;
  if (r.status !== 0 || !fs.existsSync(file)) throw new Error(`pdftoppm page ${page} failed: ${r.err.trim()}`);
  const img = readPpm(fs.readFileSync(file));
  fs.rmSync(file);
  return { width: img.width, height: img.height, data: Buffer.from(img.data) };
}

/** Words on one page with their boxes in points, from pdftotext -bbox. */
function wordBoxes(pdf: string, page: number): { word: string; xMin: number; yMin: number; xMax: number; yMax: number }[] {
  const out = tool('pdftotext', ['-bbox', '-f', String(page), '-l', String(page), pdf, '-']).out;
  return [...out.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)].map((m) => ({
    xMin: Number(m[1]),
    yMin: Number(m[2]),
    xMax: Number(m[3]),
    yMax: Number(m[4]),
    word: m[5]!,
  }));
}

export function inspectItem(item: InspectItem): Inspection {
  fs.mkdirSync(path.join(item.outDir, 'pages'), { recursive: true });
  const candidate = facts(item.pdf, path.join(item.outDir, 'text'));
  const reference = item.reference ? facts(item.reference, null) : null;
  const result: Inspection = { id: item.id, candidate, reference, pages: [], colorSamples: [] };
  if (!candidate.readable) return result;
  const scale = RASTER_DPI / 72;
  const tmp = path.join(item.outDir, '.raster');
  for (let page = 1; page <= candidate.pages; page++) {
    const name = `page-${String(page).padStart(3, '0')}.png`;
    let img: Rgb | null = rasterize(item.pdf, page, tmp);
    fs.writeFileSync(path.join(item.outDir, 'pages', name), encodePng(img));
    const pageResult: PageResult = { page, png: path.join('pages', name), diff: null };
    if (reference?.readable && page <= reference.pages) {
      let ref: Rgb | null = rasterize(item.reference!, page, `${tmp}-ref`);
      const { metrics, image } = diffImages(img, ref);
      let png: string | null = null;
      if (image) {
        fs.mkdirSync(path.join(item.outDir, 'diff'), { recursive: true });
        png = path.join('diff', name);
        fs.writeFileSync(path.join(item.outDir, png), encodePng(image));
      }
      pageResult.diff = { ...metrics, png };
      ref = null;
    }
    if (item.colorWords.length) {
      for (const box of wordBoxes(item.pdf, page).filter((b) => item.colorWords.includes(b.word))) {
        // Just left of the word, inside the cell's padding: the row background.
        const rgb = pixelAt(img, (box.xMin - 3) * scale, ((box.yMin + box.yMax) / 2) * scale);
        result.colorSamples.push({ word: box.word, page, rgb, color: classifyColor(rgb) });
      }
    }
    result.pages.push(pageResult);
    img = null;
  }
  return result;
}

if (require.main === module) {
  const jobFile = process.argv[2];
  if (!jobFile) throw new Error('usage: inspect.js <job.json>');
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8')) as InspectJob;
  const versions = toolVersions();
  fs.writeFileSync(path.join(path.dirname(jobFile), 'tools.json'), JSON.stringify(versions, null, 2));
  for (const [i, item] of job.items.entries()) {
    process.stdout.write(`[${i + 1}/${job.items.length}] ${item.id}\n`);
    let inspection: Inspection;
    try {
      inspection = inspectItem(item);
    } catch (error) {
      inspection = {
        id: item.id,
        candidate: { readable: false, error: error instanceof Error ? error.message : String(error), pages: 0, pageSizes: [], fonts: [], normalizedPages: [] },
        reference: null,
        pages: [],
        colorSamples: [],
      };
    }
    fs.writeFileSync(path.join(item.outDir, 'inspection.json'), JSON.stringify(inspection));
  }
}
