import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

export type FileType = 'pdf' | 'xlsx';

/**
 * Generate a presigned URL for uploading a file to R2
 * @param key - The object key (filename) in the bucket
 * @param contentType - MIME type of the file
 * @param expiresIn - Expiration time in seconds (default 1 hour)
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3, command, { expiresIn });
}

/**
 * Stream file from R2
 * Returns a readable stream for memory-efficient processing of large files
 * @param key - The object key (filename) in the bucket
 * @returns Promise<Readable> - Readable stream of file contents
 */
export async function streamFileFromR2(key: string): Promise<Readable> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });

  const response = await s3.send(command);

  if (!response.Body) {
    throw new Error('No body in R2 response');
  }

  // AWS SDK v3 returns a readable stream
  return response.Body as Readable;
}

/**
 * Download file from R2 as buffer
 * @param key - The object key (filename) in the bucket
 * @returns Promise<Buffer> - File contents as buffer
 */
export async function downloadFileFromR2(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });

  const response = await s3.send(command);
  const chunks: Uint8Array[] = [];

  if (response.Body) {
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
  }

  return Buffer.concat(chunks);
}

export async function uploadFileToR2(
  stream: Readable,
  key: string,
  fileType: FileType
): Promise<boolean> {
  try {
    const contentType =
      fileType === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: stream,
        ContentType: contentType,
      },
    });

    await upload.done();
    console.log(`${fileType.toUpperCase()} Upload successful`);
    return true;
  } catch (err) {
    console.error(`${fileType.toUpperCase()} Upload failed`, err);
    return false;
  }
}
