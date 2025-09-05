import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { config } from 'dotenv';

config();

const REQUIRED_ENV = [
  'R2_ENDPOINT',
  'R2_BUCKET_NAME',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
] as const;
for (const k of REQUIRED_ENV) {
  if (!process.env[k]) {
    throw new Error(`Missing required env: ${k}`);
  }
}

const s3 = new S3Client({
  region: 'auto', // Cloudflare R2 doesn't care about region
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true, // Required/recommended for R2
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadPdfToR2(
  pdfBuffer: Buffer,
  fileName?: string
): Promise<string> {
  const key = fileName || `${randomUUID()}.pdf`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
  });

  await s3.send(command);

  return `${key}`;
}

/**
 * Generate a presigned URL for reading a file from R2.
 *
 * @param key - The object key (filename) in the bucket
 * @param expiresIn - Expiration time in seconds (default 1 hour)
 */
export async function getPresignedReadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn });
}
