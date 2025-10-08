import { type NextRequest, NextResponse } from "next/server";
import {
  generateReportSchema,
  type GenerateReportData,
  type EnrichedReportData,
  type GenerateReportFrontendResponse,
  type ErrorResponse,
  getPrismaReportType,
  validateReportType,
} from "@voter-file-tool/shared-validators";
import { withPrivilege } from "../lib/withPrivilege";
import prisma from "~/lib/prisma";
import { PrivilegeLevel, JobStatus } from "@prisma/client";
import type { Session } from "next-auth";
import { gzipSync } from "node:zlib";
import { createWebhookSignature } from "~/lib/webhookUtils";

const PDF_API_BASE = process.env.PDF_SERVER_URL
  ? process.env.PDF_SERVER_URL
  : "http://localhost:8080";

const PDF_API_URL = PDF_API_BASE + "/start-job";

export const POST = withPrivilege(
  PrivilegeLevel.RequestAccess,
  async (
    req: NextRequest,
    session: Session,
  ): Promise<NextResponse<GenerateReportFrontendResponse | ErrorResponse>> => {
    let reportId: string | undefined;

    try {
      const requestBody: unknown = await req.json();

      const parsedRequest = generateReportSchema.safeParse(requestBody);

      if (!parsedRequest.success) {
        const errorResponse: ErrorResponse = {
          error: "Validation failed",
          issues: parsedRequest.error.issues,
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }

      const reportData: GenerateReportData = parsedRequest.data;

      if (!session?.user?.id) {
        throw new Error("Error getting user from session");
      }

      const reportType = getPrismaReportType(
        validateReportType(reportData.type),
      );

      const report = await prisma.report.create({
        data: {
          generatedById: session.user.id,
          ReportType: reportType,
          title: reportData.name,
          description: reportData.description,
          status: JobStatus.PENDING,
        },
      });

      reportId = report.id;

      const enrichedReportData: EnrichedReportData = {
        ...reportData,
        reportAuthor: session.user.id,
        jobId: reportId,
      };

      const gzippedBuffer = gzipSync(JSON.stringify(enrichedReportData));

      // Get webhook secret for HMAC signing
      const webhookSecret = process.env.WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error("WEBHOOK_SECRET environment variable is not set");
      }

      // Create HMAC signature for the gzipped payload
      const signature = createWebhookSignature(
        gzippedBuffer.toString("binary"),
        webhookSecret,
      );

      const response = await fetch(PDF_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-signature": signature,
        },
        body: new Uint8Array(gzippedBuffer),
      });

      const responseData = (await response.json()) as {
        success: boolean;
        message: string;
        numJobs: number;
      };

      if (response.ok && responseData.success) {
        await prisma.report.update({
          where: { id: reportId },
          data: { status: JobStatus.PROCESSING },
        });

        const successResponse: GenerateReportFrontendResponse = {
          reportId,
          jobsAhead: responseData.numJobs,
        };
        return NextResponse.json(successResponse, { status: 200 });
      } else {
        await prisma.report.update({
          where: { id: reportId },
          data: {
            status: JobStatus.FAILED,
            completedAt: new Date(),
          },
        });

        throw new Error(`Failed to start report job: ${response.statusText}`);
      }
    } catch (error) {
      console.error(error);

      if (reportId) {
        try {
          await prisma.report.update({
            where: { id: reportId },
            data: {
              status: JobStatus.FAILED,
              completedAt: new Date(),
            },
          });
        } catch (updateError) {
          console.error(
            "Failed to update report status to FAILED:",
            updateError,
          );
        }
      }

      const errorResponse: ErrorResponse = {
        error: "Internal Server Error",
        message: error,
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }
  },
);
