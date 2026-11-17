import { deflateSync } from 'zlib';

/**
 * Image helpers with no dependencies, so the comparison image needs only Node and Poppler:
 * read pdftoppm's binary PPM (P6), diff two rasters, and write PNGs for human review.
 */

export type Rgb = { width: number; height: number; data: Buffer };

export function readPpm(buf: Buffer): Rgb {
  let pos = 0;
  const token = (): string => {
    while (pos < buf.length) {
      const c = buf[pos]!;
      if (c === 0x23) while (pos < buf.length && buf[pos] !== 0x0a) pos++; // comment
      else if (c === 0x20 || c === 0x0a || c === 0x0d || c === 0x09) pos++;
      else break;
    }
    const start = pos;
    while (pos < buf.length && ![0x20, 0x0a, 0x0d, 0x09].includes(buf[pos]!)) pos++;
    return buf.subarray(start, pos).toString('latin1');
  };
  if (token() !== 'P6') throw new Error('not a binary PPM (P6)');
  const width = Number(token());
  const height = Number(token());
  const max = Number(token());
  if (max !== 255) throw new Error(`unsupported PPM max value ${max}`);
  pos++; // single whitespace before the raster
  const data = buf.subarray(pos, pos + width * height * 3);
  if (data.length !== width * height * 3) throw new Error('truncated PPM');
  return { width, height, data };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Buffer): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, body: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, 'latin1'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([len, typed, crc]);
}

export function encodePng(img: Rgb): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(img.width, 0);
  header.writeUInt32BE(img.height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolour RGB
  const stride = img.width * 3;
  const raw = Buffer.alloc((stride + 1) * img.height);
  for (let y = 0; y < img.height; y++) img.data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export type DiffMetrics = {
  sameSize: boolean;
  changedPixels: number;
  totalPixels: number;
  changedRatio: number;
  maxChannelDelta: number;
  /** Bounding box of the changed pixels, in raster pixels. */
  bbox: { x0: number; y0: number; x1: number; y1: number } | null;
};

/**
 * Counts pixels whose colour differs at all; no tolerance, since any change goes to a human.
 * The diff image greys the candidate out and paints changed pixels red.
 */
export function diffImages(candidate: Rgb, reference: Rgb): { metrics: DiffMetrics; image: Rgb | null } {
  const sameSize = candidate.width === reference.width && candidate.height === reference.height;
  const totalPixels = candidate.width * candidate.height;
  if (!sameSize) {
    return { metrics: { sameSize, changedPixels: totalPixels, totalPixels, changedRatio: 1, maxChannelDelta: 255, bbox: null }, image: null };
  }
  const out = Buffer.alloc(candidate.data.length);
  let changed = 0;
  let maxDelta = 0;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  for (let i = 0, p = 0; i < candidate.data.length; i += 3, p++) {
    const d = Math.max(
      Math.abs(candidate.data[i]! - reference.data[i]!),
      Math.abs(candidate.data[i + 1]! - reference.data[i + 1]!),
      Math.abs(candidate.data[i + 2]! - reference.data[i + 2]!),
    );
    if (d > 0) {
      changed++;
      if (d > maxDelta) maxDelta = d;
      const x = p % candidate.width;
      const y = Math.floor(p / candidate.width);
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
      out[i] = 255;
      out[i + 1] = 0;
      out[i + 2] = 0;
    } else {
      const grey = 200 + Math.round((candidate.data[i]! + candidate.data[i + 1]! + candidate.data[i + 2]!) / 3 / 255 * 55);
      out[i] = out[i + 1] = out[i + 2] = grey;
    }
  }
  return {
    metrics: { sameSize, changedPixels: changed, totalPixels, changedRatio: changed / totalPixels, maxChannelDelta: maxDelta, bbox: changed ? { x0, y0, x1, y1 } : null },
    image: changed ? { width: candidate.width, height: candidate.height, data: out } : null,
  };
}

export function pixelAt(img: Rgb, x: number, y: number): [number, number, number] | null {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= img.width || yi >= img.height) return null;
  const i = (yi * img.width + xi) * 3;
  return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!];
}

/** Tailwind 3's green-100 and amber-100, the petition-outcome row backgrounds, and white. */
export const NAMED_COLORS = { green: [220, 252, 231], amber: [254, 243, 199], white: [255, 255, 255] } as const;

export function classifyColor(rgb: [number, number, number] | null): keyof typeof NAMED_COLORS | 'other' {
  if (!rgb) return 'other';
  let best: keyof typeof NAMED_COLORS | 'other' = 'other';
  let bestDist = 12; // max channel distance still counted as the named colour
  for (const [name, c] of Object.entries(NAMED_COLORS) as [keyof typeof NAMED_COLORS, readonly number[]][]) {
    const dist = Math.max(...c.map((v, i) => Math.abs(v - rgb[i]!)));
    if (dist <= bestDist) {
      best = name;
      bestDist = dist;
    }
  }
  return best;
}
