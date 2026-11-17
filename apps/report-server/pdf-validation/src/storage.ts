import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { parse } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { SERVER_DIR } from './common';

export const R2_KEYS = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'] as const;
type R2Key = (typeof R2_KEYS)[number];
export type R2Config = Record<R2Key, string>;

export type StorageConfig = {
  r2: R2Config;
  /**
   * `test-bucket`: the harness env file names its own bucket (preferred).
   * `service-bucket-prefix`: no test bucket configured, so objects go to the service's bucket,
   * always under pdf-validation/<run-id>/. Credentials missing from the harness file are read
   * from the service's .env (read-only) in both cases.
   */
  source: 'test-bucket' | 'service-bucket-prefix';
  envFile: string;
  envFileFound: boolean;
};

function readEnvFile(file: string): Record<string, string> {
  return fs.existsSync(file) ? parse(fs.readFileSync(file)) : {};
}

/** Never edits either file; the service's .env is only read. */
export function loadStorageConfig(envFile: string): StorageConfig {
  const harness = readEnvFile(envFile);
  const service = readEnvFile(path.join(SERVER_DIR, '.env'));
  const pick = (k: R2Key) => harness[k] || service[k] || '';
  const r2 = Object.fromEntries(R2_KEYS.map((k) => [k, pick(k)])) as R2Config;
  const missing = R2_KEYS.filter((k) => !r2[k]);
  if (missing.length) {
    throw new Error(`Storage is not configured: ${missing.join(', ')} missing from ${envFile} and apps/report-server/.env`);
  }
  return { r2, source: harness.R2_BUCKET_NAME ? 'test-bucket' : 'service-bucket-prefix', envFile, envFileFound: fs.existsSync(envFile) };
}

export class Storage {
  private readonly client: S3Client;
  readonly bucket: string;

  /** Every request is bounded, so a stalled R2 call can't hang render, verify or cleanup. */
  constructor(r2: R2Config, private readonly timeoutMs = 180_000) {
    this.bucket = r2.R2_BUCKET_NAME;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${r2.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: r2.R2_ACCESS_KEY_ID, secretAccessKey: r2.R2_SECRET_ACCESS_KEY },
      forcePathStyle: true,
    });
  }

  async put(key: string, body: Buffer | string, contentType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }), this.signal());
  }

  async get(key: string, timeoutMs: number): Promise<Buffer> {
    const signal = AbortSignal.timeout(timeoutMs);
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: signal });
    if (!response.Body) throw new Error(`No body for ${key}`);
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  async exists(key: string): Promise<boolean> {
    const listed = await this.list(key);
    return listed.includes(key);
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let token: string | undefined;
    do {
      const page = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }), this.signal());
      for (const o of page.Contents ?? []) if (o.Key) keys.push(o.Key);
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return keys;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }), this.signal());
  }

  private signal() {
    return { abortSignal: AbortSignal.timeout(this.timeoutMs) };
  }
}
