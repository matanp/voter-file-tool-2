import { NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { z } from "zod";

export async function GET() {
  try {
    const officeNames = await prisma.officeName.findMany();

    return NextResponse.json(officeNames);
  } catch (error) {
    console.error("Error fetching election dates:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

const createOfficeSchema = z.object({
  name: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = createOfficeSchema.parse(body);

    const newDate = await prisma.officeName.create({
      data: { officeName: parsed.name },
    });

    return NextResponse.json(newDate, { status: 201 });
  } catch (error) {
    console.error("Error creating election office:", error);
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}
