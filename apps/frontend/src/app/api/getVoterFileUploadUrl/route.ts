import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPresignedUploadUrl } from "~/lib/s3Utils";
import { withPrivilege } from "../lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";
import { sanitizeForS3Key } from "@voter-file-tool/shared-validators";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB limit for voter files

// Valid voter file content types
const VALID_VOTER_FILE_CONTENT_TYPES = [
  "text/plain",
  "text/csv",
] as const;

interface UploadRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
}

/**
 * Validates that the provided content type is valid for voter files
 */
function isValidVoterFileContentType(
  contentType: string,
): contentType is (typeof VALID_VOTER_FILE_CONTENT_TYPES)[number] {
  return VALID_VOTER_FILE_CONTENT_TYPES.includes(
    contentType as (typeof VALID_VOTER_FILE_CONTENT_TYPES)[number],
  );
}

async function getVoterFileUploadUrlHandler(req: NextRequest, _session: Session) {
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
    if (!fileName.endsWith(".txt")) {
      return NextResponse.json(
        { error: "Only .txt files are allowed for voter file uploads" },
        { status: 400 },
      );
    }

    // Validate content type
    if (!isValidVoterFileContentType(contentType)) {
      return NextResponse.json(
        {
          error: "Invalid content type. Only text/plain and text/csv are allowed",
          allowedTypes: VALID_VOTER_FILE_CONTENT_TYPES,
          providedType: contentType,
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 500MB)" },
        { status: 400 },
      );
    }

    // Generate unique key to avoid conflicts
    const timestamp = Date.now();
    const sanitizedFileName = sanitizeForS3Key(fileName);
    const fileKey = `voter-file-uploads/${timestamp}-${sanitizedFileName}`;

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

// Export the authenticated handler - only admins can upload voter files
export const POST = withPrivilege(PrivilegeLevel.Admin, getVoterFileUploadUrlHandler);
