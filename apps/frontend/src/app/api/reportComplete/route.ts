import { JobStatus, type Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import {
  reportCompleteWebhookPayloadSchema,
  type ReportCompleteWebhookPayload,
  type ReportCompleteResponse,
  type ErrorResponse,
} from "@voter-file-tool/shared-validators";
import prisma from "~/lib/prisma";
import { verifyWebhookSignature } from "~/lib/webhookUtils";
import * as Ably from "ably";
import { getPresignedReadUrl } from "~/lib/s3Utils";
import {
  withBackendCheck,
  BackendAuthError,
} from "~/app/api/lib/withPrivilege";

export function reportCompleteVerifier(
  req: NextRequest,
): Promise<{ rawBody: string }> {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("Server configuration error");
  }
  return req.text().then((rawBody) => {
    const signature = req.headers.get("x-webhook-signature");
    if (!signature) {
      throw new BackendAuthError("Missing signature");
    }
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      throw new BackendAuthError("Invalid signature");
    }
    return { rawBody };
  });
}

async function reportCompleteHandler(
  req: NextRequest,
  { rawBody }: { rawBody: string },
): Promise<NextResponse<ReportCompleteResponse | ErrorResponse>> {
  if (!process.env.ABLY_API_KEY) {
    const errorResponse: ErrorResponse = {
      error: `Missing ABLY_API_KEY environment variable.
        If you're running locally, please ensure you have a ./.env file with a value for ABLY_API_KEY=your-key.
        If you're running in Netlify, make sure you've configured env variable ABLY_API_KEY. 
        Please see README.md for more details on configuring your Ably API Key.`,
    };
    return NextResponse.json(errorResponse, {
      status: 500,
      headers: new Headers({
        "content-type": "application/json",
      }),
    });
  }
  try {
    // Parse and validate the JSON payload
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      console.error("Invalid JSON payload:", error);
      const errorResponse: ErrorResponse = {
        error: "Invalid JSON payload",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate payload schema
    const validationResult = reportCompleteWebhookPayloadSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Payload validation failed:", validationResult.error);
      const errorResponse: ErrorResponse = {
        error: "Invalid payload",
        details: validationResult.error.errors,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const {
      success,
      jobId,
      url,
      error,
      metadata,
    }: ReportCompleteWebhookPayload = validationResult.data;

    const existingReport = await prisma.report.findUnique({
      where: { id: jobId },
      select: { status: true },
    });

    if (!existingReport) {
      const errorResponse: ErrorResponse = {
        error: "Report not found",
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Only process updates if the report is in PROCESSING status
    // This prevents regressing terminal statuses and makes the endpoint idempotent
    if (existingReport.status !== JobStatus.PROCESSING) {
      console.warn(
        `Report ${jobId} is not in PROCESSING status (current: ${existingReport.status}), skipping update`,
      );
      const response: ReportCompleteResponse = {
        received: true,
        skipped: true,
      };
      return NextResponse.json(response, { status: 200 });
    }
    const client = new Ably.Rest(process.env.ABLY_API_KEY);
    const channel = client.channels.get(`report-status-${jobId}`);

    let signedUrl;
    if (url) {
      signedUrl = await getPresignedReadUrl(url);
    }

    if (success) {
      // Data-driven approach: If the report-server provides a URL, the job generated a file.
      // If no URL is provided, the job completed without generating a downloadable file (e.g., voter imports).
      // This makes the code maintainable - no need to hardcode which report types produce files.

      await prisma.report.update({
        where: {
          id: jobId,
        },
        data: {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
          // Only set fileKey if URL is provided
          ...(url ? { fileKey: url } : {}),
          // Store metadata if provided (e.g., voter import statistics)
          ...(metadata ? { metadata: metadata as Prisma.InputJsonValue } : {}),
        },
      });
    } else {
      console.error("Job failed:", error);

      await prisma.report.update({
        where: {
          id: jobId,
        },
        data: {
          status: JobStatus.FAILED,
          completedAt: new Date(),
        },
      });
    }

    const ablyMessage = {
      jobId,
      status: success ? JobStatus.COMPLETED : JobStatus.FAILED,
      ...(success ? { url: signedUrl } : { error }),
      timestamp: new Date().toISOString(),
    };

    await channel.publish("report", ablyMessage);

    const response: ReportCompleteResponse = {
      received: true,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error("Error in report complete endpoint:", err);
    const errorResponse: ErrorResponse = {
      error: "Internal Server Error",
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export const POST = withBackendCheck(
  reportCompleteVerifier,
  reportCompleteHandler,
);
