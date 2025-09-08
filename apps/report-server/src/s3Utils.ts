import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { Readable } from 'stream';

config();

const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const s3 = new S3Client({
  region: 'auto', // Cloudflare R2 doesn't care about region
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

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

export async function uploadPDFToR2(
  pdfStream: Readable,
  key: string
): Promise<boolean> {
  try {
    const upload = new Upload({
      client: s3,
      params: {
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: pdfStream,
        ContentType: 'application/pdf',
      },
    });

    await upload.done();
    console.log('Upload successful');
    return true;
  } catch (err) {
    console.error('Upload failed', err);
    return false;
  }
}
