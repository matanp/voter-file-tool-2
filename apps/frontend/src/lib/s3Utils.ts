import "server-only";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Validate required environment variables
const requiredEnvVars = {
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
};

for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Initialize S3 client for R2
const s3 = new S3Client({
  region: "auto", // R2 doesn't require a real AWS region
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true, // Force path-style addressing for Cloudflare R2
});

/**
 * Upload a file buffer to R2
 *
 * @param key - The object key (filename) in the bucket
 * @param body - File contents as a Buffer, Uint8Array, or string
 * @param contentType - MIME type of the file
 */
export async function uploadPdfToR2(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType = "application/pdf",
) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3.send(command);
  return key;
}

/**
 * Generate a presigned URL for reading a file from R2
 *
 * @param key - The object key (filename) in the bucket
 * @param expiresIn - Expiration time in seconds (default 1 hour)
 */
export async function getPresignedReadUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  console.log("getting presigned for ", key);
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn });
}

/**
 * Get file metadata including size from R2
 *
 * @param key - The object key (filename) in the bucket
 */
export async function getFileMetadata(key: string): Promise<{
  size: number;
  contentType?: string;
  lastModified?: Date;
} | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    });

    const response = await s3.send(command);

    return {
      size: response.ContentLength ?? 0,
      contentType: response.ContentType,
      lastModified: response.LastModified,
    };
  } catch (error) {
    console.error(`Error getting file metadata for ${key}:`, error);
    return null;
  }
}
