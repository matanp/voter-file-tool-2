import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPresignedUploadUrl } from "~/lib/s3Utils";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

interface UploadRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
}

export async function POST(req: NextRequest) {
  try {
    const { fileName, fileSize, contentType } =
      (await req.json()) as UploadRequest;

    // Basic validation for admin use
    if (!fileName.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Only CSV files are allowed" },
        { status: 400 },
      );
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 50MB)" },
        { status: 400 },
      );
    }

    // Generate unique key to avoid conflicts
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileKey = `csv-uploads/${timestamp}-${sanitizedFileName}`;

    // Get presigned URL
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
