import { inflateSync } from 'zlib';
import { listedKeys } from '../cleanup';
import { assertKeyInRun, assertRunId } from '../common';
import { fixtureById } from '../fixtures';
import { classifyColor, diffImages, encodePng, readPpm, type Rgb } from '../image';
import { validateReview } from '../llmReview';
import { boxChecks, renderPlan } from '../render';
import { countOccurrences, normalizePageText, splitPages } from '../text';
import { withFrozenClock } from '../worker';

const RUN = '20261116T153000Z-ab12cd';

describe('run keys', () => {
  it('accepts only well-formed run IDs', () => {
    expect(() => assertRunId(RUN)).not.toThrow();
    expect(() => assertRunId('../other')).toThrow();
  });

  it('refuses keys outside the run prefix, so cleanup cannot reach other objects', () => {
    expect(() => assertKeyInRun(`pdf-validation/${RUN}/pdf/chrome/x.pdf`, RUN)).not.toThrow();
    expect(() => assertKeyInRun('reports/real.pdf', RUN)).toThrow();
    expect(() => assertKeyInRun(`pdf-validation/${RUN}/../other/x`, RUN)).toThrow();
    expect(() => assertKeyInRun(`pdf-validation/${RUN}/`, RUN)).toThrow();
    // Invalid input on purpose: a manifest listing a key outside the run.
    expect(() => listedKeys(RUN, { manifests: [{ objects: [{ key: 'pdf-validation/baselines/x.pdf' }] } as never] })).toThrow();
  });

  it('always lists the manifest itself', () => {
    expect(listedKeys(RUN, { manifests: [] })).toEqual([`pdf-validation/${RUN}/manifest.json`]);
  });
});

describe('render', () => {
  it('alternates browser order between fixtures for --browser both', () => {
    const fixtures = [fixtureById('roster-quick'), fixtureById('legacy-quick')];
    expect(renderPlan(fixtures, 'both').map((s) => `${s.fixture.id}.${s.browser}`)).toEqual([
      'roster-quick.chrome',
      'roster-quick.shell',
      'legacy-quick.shell',
      'legacy-quick.chrome',
    ]);
  });

  it('checks a PDF for bytes, header and EOF marker without Poppler', () => {
    expect(boxChecks(Buffer.from('%PDF-1.4\n...\n%%EOF\n')).every((c) => c.ok)).toBe(true);
    expect(boxChecks(Buffer.from('<html>')).filter((c) => !c.ok).map((c) => c.id)).toEqual(['pdf-header', 'pdf-eof']);
    expect(boxChecks(Buffer.alloc(0)).find((c) => c.id === 'nonempty')?.ok).toBe(false);
  });

  it('freezes Date only while generating HTML', () => {
    const inside = withFrozenClock('2026-03-02T15:00:00.000Z', () => [new Date().toISOString(), Date.now(), new Date('2020-01-01').getUTCFullYear()]);
    expect(inside).toEqual(['2026-03-02T15:00:00.000Z', Date.parse('2026-03-02T15:00:00.000Z'), 2020]);
    expect(new Date().getUTCFullYear()).not.toBe(1970);
    expect(Date.now()).not.toBe(Date.parse('2026-03-02T15:00:00.000Z'));
  });
});

describe('text', () => {
  it('normalizes NFC and whitespace within a page, keeping case, digits and punctuation', () => {
    expect(normalizePageText('  Café   LD 01,\n  Page 1 of 2 ')).toBe('Café LD 01, Page 1 of 2');
  });

  it('splits pdftotext pages on form feeds', () => {
    expect(splitPages('a\fb\f', 2)).toEqual(['a', 'b']);
  });

  it('counts non-overlapping occurrences', () => {
    expect(countOccurrences('MEMBER00001 MEMBER000011', 'MEMBER00001')).toBe(2);
    expect(countOccurrences('aaaa', 'aa')).toBe(2);
  });
});

describe('image', () => {
  const img = (pixels: number[][]): Rgb => ({ width: pixels.length, height: 1, data: Buffer.from(pixels.flat()) });

  it('reads a binary PPM', () => {
    const ppm = Buffer.concat([Buffer.from('P6\n# c\n2 1\n255\n'), Buffer.from([1, 2, 3, 4, 5, 6])]);
    expect(readPpm(ppm)).toEqual({ width: 2, height: 1, data: Buffer.from([1, 2, 3, 4, 5, 6]) });
  });

  it('writes a PNG whose pixels decode back', () => {
    const png = encodePng(img([[255, 0, 0], [0, 0, 255]]));
    expect(png.subarray(1, 4).toString('latin1')).toBe('PNG');
    const idatLen = png.readUInt32BE(33);
    const raw = inflateSync(png.subarray(41, 41 + idatLen));
    expect([...raw]).toEqual([0, 255, 0, 0, 0, 0, 255]);
  });

  it('counts every changed pixel, with no tolerance', () => {
    const { metrics, image } = diffImages(img([[255, 255, 255], [10, 10, 10]]), img([[255, 255, 254], [10, 10, 10]]));
    expect(metrics.changedPixels).toBe(1);
    expect(metrics.maxChannelDelta).toBe(1);
    expect(image?.data.subarray(0, 3)).toEqual(Buffer.from([255, 0, 0]));
    expect(diffImages(img([[1, 1, 1]]), img([[1, 1, 1], [2, 2, 2]])).metrics.changedRatio).toBe(1);
  });

  it('classifies the outcome row backgrounds', () => {
    expect(classifyColor([220, 252, 231])).toBe('green');
    expect(classifyColor([254, 243, 199])).toBe('amber');
    expect(classifyColor([255, 255, 255])).toBe('white');
    expect(classifyColor([200, 0, 0])).toBe('other');
  });
});

describe('LLM review file', () => {
  const valid = { runId: RUN, checklistSha256: 'x', reviewer: 'claude', reviewedAt: 't', findings: [{ fixture: 'f', browser: 'chrome', page: 1, finding: 'ok', severity: 'none' }] };

  it('accepts the documented schema', () => {
    expect(validateReview(valid, RUN).findings).toHaveLength(1);
  });

  it.each([
    ['another run', { ...valid, runId: 'other' }],
    ['an unknown severity', { ...valid, findings: [{ ...valid.findings[0], severity: 'pass' }] }],
    ['a page 0', { ...valid, findings: [{ ...valid.findings[0], page: 0 }] }],
    ['an unknown browser', { ...valid, findings: [{ ...valid.findings[0], browser: 'firefox' }] }],
    ['no reviewer', { ...valid, reviewer: '' }],
  ])('rejects %s', (_label, value) => {
    expect(() => validateReview(value, RUN)).toThrow();
  });
});
