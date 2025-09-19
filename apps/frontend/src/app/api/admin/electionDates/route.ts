import { NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    const dates = await prisma.electionDate.findMany({
      orderBy: { date: "asc" },
    });
    return NextResponse.json(dates);
  } catch (error) {
    console.error("Error fetching election dates:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

const createDateSchema = z.object({
  date: z.string().refine(
    (val) => {
      return !isNaN(Date.parse(val));
    },
    {
      message: "Invalid date string",
    },
  ),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = createDateSchema.parse(body);

    // Normalize to midnight UTC for day-level uniqueness
    const electionDate = new Date(parsed.date);
    electionDate.setUTCHours(0, 0, 0, 0);

    const existingDate = await prisma.electionDate.findFirst({
      where: { date: electionDate },
    });

    if (existingDate) {
      return NextResponse.json(
        { error: "Election date already exists" },
        { status: 409 },
      );
    }

    const newDate = await prisma.electionDate.create({
      data: { date: electionDate },
    });

    revalidatePath("/petitions");

    return NextResponse.json(newDate, { status: 201 });
  } catch (error) {
    console.error("Error creating election date:", error);

    // Handle Prisma unique constraint violation
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Election date already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}
