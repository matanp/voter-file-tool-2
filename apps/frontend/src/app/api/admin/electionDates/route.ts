import { NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { z } from "zod";

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
    console.log(body);
    const parsed = createDateSchema.parse(body);

    const newDate = await prisma.electionDate.create({
      data: { date: new Date(parsed.date) },
    });

    return NextResponse.json(newDate, { status: 201 });
  } catch (error) {
    console.error("Error creating election date:", error);
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}
