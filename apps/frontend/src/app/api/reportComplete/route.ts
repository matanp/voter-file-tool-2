import { JobStatus } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "~/lib/prisma";
import { verifyWebhookSignature } from "~/lib/webhookUtils";

// Schema for webhook payload validation
const webhookPayloadSchema = z.object({
  success: z.boolean(),
  jobId: z.string(),
  type: z.string().optional(),
  url: z.string().optional(),
  error: z.string().optional(),
});

export const POST = async (req: NextRequest) => {
  try {
    // Get the raw body for HMAC verification
    const rawBody = await req.text();

    // Verify HMAC signature
    const signature = req.headers.get("x-webhook-signature");
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("WEBHOOK_SECRET environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    if (!signature) {
      console.warn("Missing webhook signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.warn("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // Parse and validate the JSON payload
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      console.error("Invalid JSON payload:", error);
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    // Validate payload schema
    const validationResult = webhookPayloadSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Payload validation failed:", validationResult.error);
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { success, jobId, url, error } = validationResult.data;

    const existingReport = await prisma.report.findUnique({
      where: { id: jobId },
      select: { status: true },
    });

    if (!existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Only process updates if the report is in PROCESSING status
    // This prevents regressing terminal statuses and makes the endpoint idempotent
    if (existingReport.status !== JobStatus.PROCESSING) {
      console.warn(
        `Report ${jobId} is not in PROCESSING status (current: ${existingReport.status}), skipping update`,
      );
      return NextResponse.json(
        { received: true, skipped: true },
        { status: 200 },
      );
    }

    if (success) {
      if (!url) {
        return NextResponse.json(
          { error: "missing url for successful job" },
          { status: 400 },
        );
      }

      await prisma.report.update({
        where: {
          id: jobId,
        },
        data: {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
          fileKey: url,
        },
      });

      return NextResponse.json({ received: true }, { status: 200 });
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

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Error in report complete endpoint:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
};
