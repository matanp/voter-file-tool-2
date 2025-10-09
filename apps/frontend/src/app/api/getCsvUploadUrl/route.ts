import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPresignedUploadUrl } from "~/lib/s3Utils";
import { withPrivilege } from "../lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";
import { sanitizeForS3Key } from "@voter-file-tool/shared-validators";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

// Valid CSV content types
const VALID_CSV_CONTENT_TYPES = [
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel", // Excel CSV export
] as const;

interface UploadRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
}

/**
 * Validates that the provided content type is valid for CSV files
 */
function isValidCsvContentType(
  contentType: string,
): contentType is (typeof VALID_CSV_CONTENT_TYPES)[number] {
  return VALID_CSV_CONTENT_TYPES.includes(
    contentType as (typeof VALID_CSV_CONTENT_TYPES)[number],
  );
}

async function getCsvUploadUrlHandler(req: NextRequest, _session: Session) {
  try {
    const { fileName, fileSize, contentType } =
      (await req.json()) as UploadRequest;

    // Validate required fields
    if (!fileName || !contentType || fileSize === undefined) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: fileName, contentType, and fileSize are required",
        },
        { status: 400 },
      );
    }

    // Validate file extension
    if (!fileName.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Only CSV files are allowed" },
        { status: 400 },
      );
    }

    // Validate content type
    if (!isValidCsvContentType(contentType)) {
      return NextResponse.json(
        {
          error: "Invalid content type. Only CSV content types are allowed",
          allowedTypes: VALID_CSV_CONTENT_TYPES,
          providedType: contentType,
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 50MB)" },
        { status: 400 },
      );
    }

    // Generate unique key to avoid conflicts
    const timestamp = Date.now();
    const sanitizedFileName = sanitizeForS3Key(fileName);
    const fileKey = `csv-uploads/${timestamp}-${sanitizedFileName}`;

    // Get presigned URL with validated content type
    const uploadUrl = await getPresignedUploadUrl(fileKey, contentType);

    return NextResponse.json({ uploadUrl, fileKey });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating presigned URL:", errorMessage);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 },
    );
  }
}

// Export the authenticated handler
export const POST = withPrivilege(PrivilegeLevel.Admin, getCsvUploadUrlHandler);
