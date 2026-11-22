jest.mock('../s3Utils', () => ({ uploadFileToR2: jest.fn() }));
jest.mock('puppeteer', () => ({ launch: jest.fn() }));

import fs from 'fs';
import path from 'path';
import type { Readable } from 'stream';
import { PDFDocument } from 'pdf-lib';
import puppeteer from 'puppeteer';
import { uploadFileToR2 } from '../s3Utils';
import { generatePDFAndUpload } from '../utils';
import { readPdfStructure } from './helpers/pdfStructure';

const dir = path.join(__dirname, 'fixtures/tagged-pdf-parts');
const read = (file: string) => new Uint8Array(fs.readFileSync(path.join(dir, file)));
const parts = ['part-0.pdf', 'part-1.pdf', 'part-2.pdf'].map(read);

type FakePage = {
  setDefaultTimeout: jest.Mock;
  setContent: jest.Mock;
  pdf: jest.Mock;
  createPDFStream: jest.Mock;
};

/**
 * One fake browser per launch. `pdfFor(html)` is what page.pdf returns for that HTML. The
 * cast is the Puppeteer boundary: generatePDFAndUpload only uses newPage/close and these
 * page methods.
 */
function fakeLaunches(pdfFor: (html: string) => Uint8Array | Promise<Uint8Array>) {
  const browsers: { close: jest.Mock; page: FakePage }[] = [];
  jest.mocked(puppeteer.launch).mockImplementation(async () => {
    let html = '';
    const page: FakePage = {
      setDefaultTimeout: jest.fn(),
      setContent: jest.fn(async (h: string) => {
        html = h;
      }),
      pdf: jest.fn(async () => pdfFor(html)),
      createPDFStream: jest.fn(),
    };
    const browser = { newPage: async () => page, close: jest.fn(), page };
    browsers.push(browser);
    return browser as unknown as Awaited<ReturnType<typeof puppeteer.launch>>;
  });
  return browsers;
}

async function uploadedBytes(): Promise<Uint8Array> {
  const stream = jest.mocked(uploadFileToR2).mock.calls[0][0] as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return new Uint8Array(Buffer.concat(chunks));
}

describe('generatePDFAndUpload with a sliced report', () => {
  beforeEach(() => {
    jest.mocked(puppeteer.launch).mockReset();
    jest.mocked(uploadFileToR2).mockReset().mockResolvedValue(true);
  });

  it('prints each slice in its own browser, closes each, and uploads one tagged PDF', async () => {
    const browsers = fakeLaunches((html) => parts[Number(html)]);
    await generatePDFAndUpload(['0', '1', '2'], true, 'report.pdf');

    expect(browsers).toHaveLength(3);
    expect(browsers.map((b) => b.page.setContent.mock.calls[0][0])).toEqual(['0', '1', '2']);
    for (const b of browsers) {
      expect(b.close).toHaveBeenCalledTimes(1);
      expect(b.page.pdf).toHaveBeenCalledWith({ format: 'Letter', landscape: true, printBackground: true });
    }
    expect(uploadFileToR2).toHaveBeenCalledTimes(1);
    expect(jest.mocked(uploadFileToR2).mock.calls[0].slice(1)).toEqual(['report.pdf', 'pdf']);
    const merged = await readPdfStructure(await uploadedBytes());
    expect(merged.pages).toBe(5);
    expect(merged.errors).toEqual([]);
    expect(merged.headerRefs).toBeGreaterThan(0);
  });

  it('uses the same page options as a single print', async () => {
    const browsers = fakeLaunches(() => parts[0]);
    await generatePDFAndUpload(['a', 'b'], false, 'x.pdf', { format: 'Legal', landscape: true });
    for (const b of browsers) {
      expect(b.page.pdf).toHaveBeenCalledWith({ format: 'Legal', landscape: true, printBackground: true });
    }
  });

  it('stops at a failing slice, closes its browser, and uploads nothing', async () => {
    const browsers = fakeLaunches((html) => {
      if (html === '1') throw new Error('print failed');
      return parts[0];
    });
    await expect(generatePDFAndUpload(['0', '1', '2'], true, 'x.pdf')).rejects.toThrow('print failed');
    expect(browsers).toHaveLength(2);
    for (const b of browsers) expect(b.close).toHaveBeenCalledTimes(1);
    expect(uploadFileToR2).not.toHaveBeenCalled();
  });

  it('fails the job when the upload fails', async () => {
    fakeLaunches(() => parts[0]);
    jest.mocked(uploadFileToR2).mockResolvedValue(false);
    await expect(generatePDFAndUpload(['0', '1'], true, 'x.pdf')).rejects.toThrow('failed to upload pdf');
  });

  it('still uploads every page, untagged, when the parts have no tags to merge', async () => {
    const untaggedPart = async () => {
      const doc = await PDFDocument.create();
      doc.addPage();
      doc.addPage();
      return doc.save();
    };
    fakeLaunches(untaggedPart);
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await generatePDFAndUpload(['0', '1'], true, 'x.pdf');
      expect(error).toHaveBeenCalledWith(expect.stringMatching(/uploading the report untagged/), expect.any(Error));
    } finally {
      error.mockRestore();
    }
    const doc = await PDFDocument.load(await uploadedBytes());
    expect(doc.getPageCount()).toBe(4);
  });

  it('streams a one-slice report as before, without merging', async () => {
    const stream = {};
    const browsers = fakeLaunches(() => parts[0]);
    jest.mocked(puppeteer.launch).mockImplementationOnce(async () => {
      const page = { setDefaultTimeout: jest.fn(), setContent: jest.fn(), createPDFStream: jest.fn().mockResolvedValue(stream), pdf: jest.fn() };
      return { newPage: async () => page, close: jest.fn() } as unknown as Awaited<ReturnType<typeof puppeteer.launch>>;
    });
    await generatePDFAndUpload(['only'], true, 'x.pdf');
    expect(browsers).toHaveLength(0);
    expect(jest.mocked(uploadFileToR2).mock.calls[0][0]).toBe(stream);
  });

  it('rejects inspectPage with slices, and an empty list, before launching Chrome', async () => {
    await expect(generatePDFAndUpload(['a', 'b'], true, 'x.pdf', undefined, async () => undefined)).rejects.toThrow(
      /inspectPage needs the report as one HTML/,
    );
    await expect(generatePDFAndUpload([], true, 'x.pdf')).rejects.toThrow(/no HTML/);
    expect(puppeteer.launch).not.toHaveBeenCalled();
  });
});
