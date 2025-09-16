import { NextResponse, type NextRequest } from "next/server";
import prisma from "~/lib/prisma";
import { z, ZodError } from "zod";
import { Prisma, PrivilegeLevel } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { withPrivilege } from "~/app/api/lib/withPrivilege";

async function getOfficeNamesHandler() {
  try {
    const officeNames = await prisma.officeName.findMany();

    return NextResponse.json(officeNames);
  } catch (error) {
    console.error("Error fetching office names:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Admin, getOfficeNamesHandler);

const createOfficeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
});

async function createOfficeHandler(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = createOfficeSchema.parse(body);

    const normalized = parsed.name.trim().toLowerCase();
    const existingOffice = await prisma.officeName.findFirst({
      where: { officeName: { equals: normalized, mode: "insensitive" } },
    });

    if (existingOffice) {
      return NextResponse.json(
        { error: "Office name already exists" },
        { status: 409 },
      );
    }

    const newOffice = await prisma.officeName.create({
      data: { officeName: normalized },
    });

    revalidatePath("/petitions");
    return NextResponse.json(newOffice, { status: 201 });
  } catch (error) {
    // Handle validation/parse errors (400)
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Handle Prisma unique constraint violation (409)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Office name already exists" },
        { status: 409 },
      );
    }

    // Handle all other unexpected server errors (500)
    console.error("Error creating office name:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, createOfficeHandler);
