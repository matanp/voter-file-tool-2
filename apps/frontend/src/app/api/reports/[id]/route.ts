import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { z } from "zod";
import { PrivilegeLevel } from "@prisma/client";
import { hasPermissionFor } from "~/lib/utils";
import { withPrivilege, type SessionWithUser } from "~/app/api/lib/withPrivilege";

const updateReportSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  public: z.boolean().optional(),
});

type RouteContext = { params?: Promise<{ id: string }> };

// Handles PATCH requests to update a report (title, description, public); expects req, session: SessionWithUser; validates ownership, updates DB, returns updated report.
async function patchReportHandler(
  req: NextRequest,
  session: SessionWithUser,
  ...contextArgs: unknown[]
) {
  try {
    const context = contextArgs[0] as RouteContext | undefined;
    const params = context?.params;
    if (!params) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { id: reportId } = await params;

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 },
      );
    }
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const validatedData = updateReportSchema.parse(body);

    const isAdmin = hasPermissionFor(
      session.user.privilegeLevel ?? PrivilegeLevel.ReadAccess,
      PrivilegeLevel.Admin,
    );

    const existingReport = await prisma.report.findFirst({
      where: {
        id: reportId,
        generatedById: session.user.id,
        deleted: false,
      },
    });

    if (!existingReport) {
      return NextResponse.json(
        { error: "Report not found or access denied" },
        { status: 404 },
      );
    }

    // Only admins can change public status
    if (validatedData.public !== undefined && !isAdmin) {
      return NextResponse.json(
        { error: "Only admins can change public status" },
        { status: 403 },
      );
    }

    // Build the update payload
    const updatePayload: {
      title?: string;
      description?: string;
      public?: boolean;
    } = {};

    if (validatedData.title !== undefined) {
      updatePayload.title = validatedData.title;
    }
    if (validatedData.description !== undefined) {
      updatePayload.description = validatedData.description;
    }
    if (validatedData.public !== undefined) {
      updatePayload.public = validatedData.public;
    }

    // Check if there are any fields to update
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No updatable fields provided" },
        { status: 400 },
      );
    }

    // Use updateMany for atomic update that will affect zero rows if deleted is true
    const updateResult = await prisma.report.updateMany({
      where: {
        id: reportId,
        generatedById: session.user.id,
        deleted: false,
      },
      data: updatePayload,
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: "Report not found or access denied" },
        { status: 404 },
      );
    }

    // Fetch the updated record
    const updatedReport = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        generatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!updatedReport) {
      return NextResponse.json(
        { error: "Report not found or access denied" },
        { status: 404 },
      );
    }

    return NextResponse.json({ report: updatedReport });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }
    console.error("Error updating report:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Handles DELETE requests to soft-delete a report; expects _req, session: SessionWithUser; validates ownership, marks report deleted in DB.
async function deleteReportHandler(
  _req: NextRequest,
  session: SessionWithUser,
  ...contextArgs: unknown[]
) {
  try {
    const context = contextArgs[0] as RouteContext | undefined;
    const params = context?.params;
    if (!params) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { id: reportId } = await params;

    // Check if the report exists and belongs to the user
    const existingReport = await prisma.report.findFirst({
      where: {
        id: reportId,
        generatedById: session.user.id,
        deleted: false,
      },
    });

    if (!existingReport) {
      return NextResponse.json(
        { error: "Report not found or access denied" },
        { status: 404 },
      );
    }

    // Mark the report as deleted instead of actually deleting it
    // Use updateMany for atomic update that will affect zero rows if already deleted
    const updateResult = await prisma.report.updateMany({
      where: {
        id: reportId,
        generatedById: session.user.id,
        deleted: false,
      },
      data: { deleted: true },
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: "Report not found or access denied" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting report:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const PATCH = withPrivilege("Authenticated", patchReportHandler);
export const DELETE = withPrivilege("Authenticated", deleteReportHandler);
