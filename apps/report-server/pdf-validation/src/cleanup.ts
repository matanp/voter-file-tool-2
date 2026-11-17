import fs from 'fs';
import path from 'path';
import { MANIFEST_NAME, assertKeyInRun, assertRunId, errorMessage, readJson, runPrefix, writeJson } from './common';
import type { RunManifest } from './manifest';
import { Storage, loadStorageConfig } from './storage';

/**
 * Every key a run may have written: its local journal (render writes each key before using it,
 * so an interrupted run still lists it), its manifest's objects, and the manifest itself.
 * Each must be inside pdf-validation/<run-id>/.
 */
export function listedKeys(runId: string, sources: { journalFile?: string; manifests: (Pick<RunManifest, 'objects' | 'attemptedKeys'> | null)[] }): string[] {
  const keys = new Set<string>([`${runPrefix(runId)}${MANIFEST_NAME}`]);
  if (sources.journalFile && fs.existsSync(sources.journalFile)) {
    for (const line of fs.readFileSync(sources.journalFile, 'utf8').split('\n').filter(Boolean)) keys.add((JSON.parse(line) as { key: string }).key);
  }
  for (const m of sources.manifests) {
    for (const o of m?.objects ?? []) keys.add(o.key);
    for (const k of m?.attemptedKeys ?? []) keys.add(k);
  }
  for (const key of keys) assertKeyInRun(key, runId);
  return [...keys].sort();
}

export type CleanupResult = { deleted: string[]; errors: string[]; unlisted: string[] };

/** Deletes only listed keys. Anything else under the run prefix is reported, never deleted. */
export async function deleteListed(storage: Pick<Storage, 'delete' | 'list'>, runId: string, keys: string[]): Promise<CleanupResult> {
  const result: CleanupResult = { deleted: [], errors: [], unlisted: [] };
  for (const key of keys) {
    assertKeyInRun(key, runId);
    try {
      await storage.delete(key);
      result.deleted.push(key);
    } catch (error) {
      result.errors.push(`${key}: ${errorMessage(error)}`);
    }
  }
  try {
    const remaining = await storage.list(runPrefix(runId));
    result.unlisted = remaining.filter((k) => !keys.includes(k));
    for (const k of remaining.filter((k) => keys.includes(k))) result.errors.push(`${k}: still present after delete`);
  } catch (error) {
    result.errors.push(`listing ${runPrefix(runId)}: ${errorMessage(error)}`);
  }
  return result;
}

/** Automatic cleanup requires a verified local copy of every object and attempted render. */
export async function cleanupVerifiedRun(
  storage: Pick<Storage, 'delete' | 'list'>,
  opts: {
    runId: string;
    runDir: string;
    keepRemote: boolean;
    manifest: Pick<RunManifest, 'objects' | 'attemptedKeys'> & { renders: { key: string }[] };
    downloadedKeys: ReadonlySet<string>;
  },
): Promise<CleanupResult | { skipped: string }> {
  const stateFile = path.join(opts.runDir, 'remote-cleanup.json');
  if (fs.existsSync(stateFile)) {
    const previous = readJson<CleanupResult>(stateFile);
    // A failed delete/list must be retried, including after an explicit cleanup succeeded.
    if (!previous.errors.length && !previous.unlisted.length) return previous;
  }
  if (opts.keepRemote) return { skipped: '--keep-remote' };
  const evidence = [...opts.manifest.objects, ...opts.manifest.renders];
  if (!evidence.every(({ key }) => opts.downloadedKeys.has(key))) {
    return { skipped: 'not every object and render downloaded and matched its hash; remote evidence kept (use cleanup for explicit deletion)' };
  }
  const result = await deleteListed(storage, opts.runId, listedKeys(opts.runId, { manifests: [opts.manifest] }));
  writeJson(stateFile, result);
  return result;
}

/** `cleanup --run-id <id>`: for interrupted or abandoned runs. Works on the box or the operator machine. */
export async function cleanup(opts: { runId: string; runsDir: string; envFile: string }): Promise<number> {
  assertRunId(opts.runId);
  const storage = new Storage(loadStorageConfig(opts.envFile).r2, 60_000);
  const runDir = path.join(opts.runsDir, opts.runId);
  const readLocal = (file: string): RunManifest | null => (fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as RunManifest) : null);
  let remote: RunManifest | null = null;
  try {
    remote = JSON.parse((await storage.get(`${runPrefix(opts.runId)}${MANIFEST_NAME}`, 60_000)).toString('utf8')) as RunManifest;
  } catch {
    // no remote manifest (interrupted before upload, or already cleaned)
  }
  const keys = listedKeys(opts.runId, {
    journalFile: path.join(runDir, 'remote-keys.jsonl'),
    manifests: [readLocal(path.join(runDir, MANIFEST_NAME)), readLocal(path.join(runDir, 'downloaded', MANIFEST_NAME)), remote],
  });
  console.log(`cleanup ${opts.runId}: ${keys.length} listed key(s) in bucket ${storage.bucket}`);
  const result = await deleteListed(storage, opts.runId, keys);
  for (const k of result.deleted) console.log(`  deleted ${k}`);
  for (const e of result.errors) console.log(`  ERROR ${e}`);
  for (const k of result.unlisted) console.log(`  NOT DELETED (not listed by this run): ${k}`);
  console.log('Local evidence is kept.');
  return result.errors.length || result.unlisted.length ? 1 : 0;
}
