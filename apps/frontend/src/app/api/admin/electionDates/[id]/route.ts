import { NextResponse } from "next/server";
import prisma from "~/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idString } = await params;
  const id = parseInt(idString, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    await prisma.electionDate.delete({ where: { id } });
    return NextResponse.json({ id, message: "Election date deleted" });
  } catch (error) {
    console.error("Error deleting election date:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
