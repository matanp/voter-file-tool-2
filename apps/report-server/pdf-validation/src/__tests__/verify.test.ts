import fs from 'fs';
import os from 'os';
import path from 'path';
import { sha256, worstStatus } from '../common';
import type { InspectJob } from '../inspect';
import type { RemoteObject } from '../manifest';
import type { Storage } from '../storage';
import { downloadObjects, inspectionJobKey } from '../verify';

const RUN = '20261116T153000Z-ab12cd';
let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-verify-')); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

it.each(['missing', 'corrupt'] as const)('fails evidence checks for a %s render log', async (failure) => {
  const pdf = Buffer.from('%PDF-1.4\n%%EOF');
  const log = Buffer.from('render completed');
  const objects: RemoteObject[] = [
    { key: `pdf-validation/${RUN}/pdf/chrome/example.pdf`, kind: 'pdf', bytes: pdf.length, sha256: sha256(pdf) },
    { key: `pdf-validation/${RUN}/render.log`, kind: 'log', bytes: log.length, sha256: sha256(log) },
  ];
  const storage: Pick<Storage, 'get'> = {
    get: async (key) => {
      if (key.endsWith('.pdf')) return pdf;
      if (failure === 'missing') throw new Error('NoSuchKey');
      return Buffer.from('corrupt log');
    },
  };
  const { downloaded, checks } = await downloadObjects(storage, objects, RUN, dir, 1000);
  expect(downloaded.get(objects[0]!.key)?.ok).toBe(true);
  expect(downloaded.get(objects[1]!.key)?.ok).toBe(false);
  expect(worstStatus(checks.map((c) => c.status))).toBe('fail');
  expect(checks[0]?.detail).toContain('render.log');
});

it('accepts matching evidence and reuses verified local files', async () => {
  const body = Buffer.from('render completed');
  const object: RemoteObject = { key: `pdf-validation/${RUN}/render.log`, kind: 'log', bytes: body.length, sha256: sha256(body) };
  const get = jest.fn<ReturnType<Storage['get']>, Parameters<Storage['get']>>().mockResolvedValue(body);
  expect((await downloadObjects({ get }, [object], RUN, dir, 1000)).checks).toEqual([]);
  expect((await downloadObjects({ get }, [object], RUN, dir, 1000)).checks).toEqual([]);
  expect(get).toHaveBeenCalledTimes(1);
});

it.each(['inspect.js', 'image.js', 'text.js', 'common.js'])('invalidates cached inspections when %s changes', (file) => {
  for (const name of ['inspect.js', 'image.js', 'text.js', 'common.js']) fs.writeFileSync(path.join(dir, name), '// original');
  const job: InspectJob = { items: [] };
  const before = inspectionJobKey(job, 'image-id', dir);
  expect(inspectionJobKey(job, 'image-id', dir)).toBe(before);
  fs.writeFileSync(path.join(dir, file), '// updated');
  expect(inspectionJobKey(job, 'image-id', dir)).not.toBe(before);
});
