import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { auth } from "~/auth";
import { z } from "zod";
import { PrivilegeLevel } from "@prisma/client";
import { hasPermissionFor } from "~/lib/utils";

const updateReportSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  public: z.boolean().optional(),
});

export const PATCH = async (
  req: NextRequest,
  { params }: { params: { id: string } },
) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reportId = params.id;
    const body = (await req.json()) as unknown;
    const validatedData = updateReportSchema.parse(body);

    const isAdmin = hasPermissionFor(
      session.user.privilegeLevel ?? PrivilegeLevel.ReadAccess,
      PrivilegeLevel.Admin,
    );

    const existingReport = await prisma.report.findFirst({
      where: {
        id: reportId,
        generatedById: session.user.id,
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

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        ...(validatedData.title !== undefined && {
          title: validatedData.title,
        }),
        ...(validatedData.description !== undefined && {
          description: validatedData.description,
        }),
        ...(validatedData.public !== undefined && {
          public: validatedData.public,
        }),
      },
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

    return NextResponse.json({ report: updatedReport });
  } catch (error) {
    console.error("Error updating report:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
};

export const DELETE = async (
  req: NextRequest,
  { params }: { params: { id: string } },
) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reportId = params.id;

    // Check if the report exists and belongs to the user
    const existingReport = await prisma.report.findFirst({
      where: {
        id: reportId,
        generatedById: session.user.id,
      },
    });

    if (!existingReport) {
      return NextResponse.json(
        { error: "Report not found or access denied" },
        { status: 404 },
      );
    }

    // Mark the report as deleted instead of actually deleting it
    await prisma.report.update({
      where: { id: reportId },
      data: { deleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting report:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
};
