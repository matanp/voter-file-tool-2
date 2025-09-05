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

      const reportJob = await prisma.reportJob.create({
        data: {
          requestedById: session.user.id,
          name: reportData.name,
          description: reportData.description,
        },
      });

      const reportJobId: string = reportJob.id;

      const enrichedReportData = {
        ...reportData,
        reportAuthor: session.user.id,
        jobId: reportJobId,
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
        return NextResponse.json({ jobId: reportJobId }, { status: 200 });
      } else {
        throw new Error(`Failed to start report job: ${response.statusText}`);
      }
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Internal Server Error", message: error },
        { status: 500 },
      );
    }
  },
);
