import "server-only";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
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
  // Without these, the SDK adds a CRC32 of the (empty) presign-time body to
  // presigned PUT URLs, which the browser's real upload can't match.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
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
  response: {
    /** Overrides the stored Content-Type on the response. */
    contentType?: string;
    /** e.g. `inline; filename="letter.pdf"`. */
    contentDisposition?: string;
  } = {},
): Promise<string> {
  console.log("getting presigned for ", key);
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ...(response.contentType
      ? { ResponseContentType: response.contentType }
      : {}),
    ...(response.contentDisposition
      ? { ResponseContentDisposition: response.contentDisposition }
      : {}),
  });

  return await getSignedUrl(s3, command, { expiresIn });
}

/**
 * Generate a presigned URL for uploading a file to R2
 *
 * @param key - The object key (filename) in the bucket
 * @param contentType - MIME type of the file
 * @param expiresIn - Expiration time in seconds (default 1 hour)
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
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

/**
 * A presigned PUT that signs the Content-Type **and** Content-Length, so the
 * browser can upload only a body of exactly that type header and size.
 */
export async function getPresignedSizedUploadUrl(
  key: string,
  contentType: string,
  contentLength: number,
  expiresIn: number,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return await getSignedUrl(s3, command, {
    expiresIn,
    signableHeaders: new Set(["content-type", "content-length"]),
  });
}

/** The object's size, or null when it doesn't exist. Other errors throw. */
export async function headObjectSize(key: string): Promise<number | null> {
  try {
    const response = await s3.send(
      new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }),
    );
    return response.ContentLength ?? 0;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    if (status === 404 || (error as { name?: string }).name === "NotFound") {
      return null;
    }
    throw error;
  }
}

/** The object's first `length` bytes (a ranged GET). */
export async function readObjectPrefix(
  key: string,
  length: number,
): Promise<Uint8Array> {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Range: `bytes=0-${length - 1}`,
    }),
  );
  if (!response.Body) return new Uint8Array();
  return await response.Body.transformToByteArray();
}

/** Server-side copy within the bucket, replacing the stored Content-Type. */
export async function copyObject(
  sourceKey: string,
  destinationKey: string,
  contentType: string,
): Promise<void> {
  const bucket = process.env.R2_BUCKET_NAME!;
  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: destinationKey,
      CopySource: `${bucket}/${sourceKey.split("/").map(encodeURIComponent).join("/")}`,
      ContentType: contentType,
      MetadataDirective: "REPLACE",
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }),
  );
}
