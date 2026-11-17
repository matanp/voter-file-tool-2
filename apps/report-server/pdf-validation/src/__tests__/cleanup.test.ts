import fs from 'fs';
import os from 'os';
import path from 'path';
import { cleanupVerifiedRun, deleteListed, type CleanupResult } from '../cleanup';
import { readJson, runPrefix } from '../common';
import type { Storage } from '../storage';

const runId = '20261116T153000Z-ab12cd';
const prefix = runPrefix(runId);
const pdf = `${prefix}pdf/chrome/roster-quick.pdf`;
const log = `${prefix}render.log`;
const manifestKey = `${prefix}manifest.json`;

describe('verification cleanup', () => {
  let runDir: string;
  let remote: Set<string>;
  let storage: Pick<Storage, 'delete' | 'list'>;

  beforeEach(() => {
    runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-cleanup-test-'));
    remote = new Set([pdf, log, manifestKey]);
    storage = {
      delete: jest.fn(async (key: string) => { remote.delete(key); }),
      list: jest.fn(async () => [...remote]),
    };
  });
  afterEach(() => fs.rmSync(runDir, { recursive: true, force: true }));

  const options = (dir: string): Parameters<typeof cleanupVerifiedRun>[1] => ({
    runId,
    runDir: dir,
    keepRemote: false,
    manifest: {
      objects: [
        { key: pdf, kind: 'pdf', bytes: 10, sha256: 'pdf-hash' },
        { key: log, kind: 'log', bytes: 10, sha256: 'log-hash' },
      ],
      attemptedKeys: [pdf, log, manifestKey],
      renders: [{ key: pdf }],
    },
    downloadedKeys: new Set([pdf, log]),
  });

  it('preserves a PDF uploaded before the box failed to download/hash it', async () => {
    const opts = options(runDir);
    opts.manifest.objects = opts.manifest.objects.filter((o) => o.key !== pdf);
    opts.downloadedKeys = new Set([log]);
    expect(await cleanupVerifiedRun(storage, opts)).toHaveProperty('skipped');
    expect(storage.delete).not.toHaveBeenCalled();
    expect(remote.has(pdf)).toBe(true);
    // An operator can still explicitly discard the failed run.
    expect((await deleteListed(storage, runId, [pdf, log, manifestKey])).errors).toEqual([]);
    expect(remote.size).toBe(0);
  });

  it('preserves evidence when an object fails verifier download/hash validation', async () => {
    const opts = options(runDir);
    opts.downloadedKeys = new Set([pdf]);
    expect(await cleanupVerifiedRun(storage, opts)).toHaveProperty('skipped');
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it.each(['delete', 'list', 'unlisted'] as const)('retries cached %s failures', async (failure) => {
    if (failure === 'delete') jest.mocked(storage.delete).mockRejectedValueOnce(new Error('temporary outage'));
    if (failure === 'list') jest.mocked(storage.list).mockRejectedValueOnce(new Error('temporary outage'));
    const extra = `${prefix}extra.pdf`;
    if (failure === 'unlisted') remote.add(extra);
    const opts = options(runDir);
    const first = await cleanupVerifiedRun(storage, opts);
    expect('skipped' in first).toBe(false);
    if ('skipped' in first) throw new Error('expected cleanup');
    expect(first.errors.length + first.unlisted.length).toBeGreaterThan(0);
    // Simulate successful explicit cleanup between verifications as well.
    await deleteListed(storage, runId, [pdf, log, manifestKey, extra]);
    expect(await cleanupVerifiedRun(storage, opts)).toEqual({ deleted: [manifestKey, pdf, log].sort(), errors: [], unlisted: [] });
    expect(readJson<CleanupResult>(path.join(runDir, 'remote-cleanup.json')).errors).toEqual([]);
  });

  it('reuses successful cleanup without contacting storage again', async () => {
    const opts = options(runDir);
    const first = await cleanupVerifiedRun(storage, opts);
    jest.mocked(storage.delete).mockClear();
    jest.mocked(storage.list).mockClear();
    expect(await cleanupVerifiedRun(storage, opts)).toEqual(first);
    expect(storage.delete).not.toHaveBeenCalled();
    expect(storage.list).not.toHaveBeenCalled();
  });

  it('retries a failed deletion on the next verify without explicit cleanup', async () => {
    const opts = options(runDir);
    jest.mocked(storage.delete).mockRejectedValueOnce(new Error('temporary outage'));
    await cleanupVerifiedRun(storage, opts);
    expect(remote.size).toBe(1);
    const result = await cleanupVerifiedRun(storage, opts);
    expect(result).toMatchObject({ errors: [], unlisted: [] });
    expect(remote.size).toBe(0);
  });

  it('honors keep-remote even after a cached failure', async () => {
    const opts = options(runDir);
    jest.mocked(storage.list).mockRejectedValueOnce(new Error('temporary outage'));
    await cleanupVerifiedRun(storage, opts);
    jest.mocked(storage.delete).mockClear();
    expect(await cleanupVerifiedRun(storage, { ...opts, keepRemote: true })).toEqual({ skipped: '--keep-remote' });
    expect(storage.delete).not.toHaveBeenCalled();
  });
});
