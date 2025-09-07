import { type NextRequest, NextResponse } from "next/server";
import { generateReportSchema } from "~/lib/validators/generateReport";
import { withPrivilege } from "../lib/withPrivilege";
import prisma from "~/lib/prisma";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";
import zlib from "zlib";

const PDF_API_BASE = process.env.PDF_SERVER_URL
  ? process.env.PDF_SERVER_URL
  : "http://localhost:8080";

const PDF_API_URL = PDF_API_BASE + "/start-job";

export const POST = withPrivilege(
  PrivilegeLevel.RequestAccess,
  async (req: NextRequest, session: Session) => {
    let reportId: string | undefined;

    try {
      const requestBody: unknown = await req.json();

      const parsedRequest = generateReportSchema.safeParse(requestBody);

      if (!parsedRequest.success) {
        return NextResponse.json(
          { error: "Validation failed", issues: parsedRequest.error.issues },
          { status: 400 },
        );
      }

      const reportData = parsedRequest.data;

      if (!session?.user?.id) {
        throw new Error("Error getting user from session");
      }

      const report = await prisma.report.create({
        data: {
          generatedById: session.user.id,
          ReportType:
            reportData.type === "ldCommittees"
              ? "CommitteeReport"
              : "DesignatedPetition",
          title: reportData.name,
          description: reportData.description,
          status: "PENDING",
        },
      });

      reportId = report.id;

      const enrichedReportData = {
        ...reportData,
        reportAuthor: session.user.id,
        jobId: reportId,
      };

      const gzippedBuffer = zlib.gzipSync(JSON.stringify(enrichedReportData));

      const response = await fetch(PDF_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: gzippedBuffer,
      });

      if (response.ok) {
        await prisma.report.update({
          where: { id: reportId },
          data: { status: "PROCESSING" },
        });

        return NextResponse.json({ reportId }, { status: 200 });
      } else {
        await prisma.report.update({
          where: { id: reportId },
          data: {
            status: "FAILED",
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
              status: "FAILED",
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

      return NextResponse.json(
        { error: "Internal Server Error", message: error },
        { status: 500 },
      );
    }
  },
);
