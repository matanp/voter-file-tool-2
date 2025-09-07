import { NextResponse } from "next/server";
import prisma from "~/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const id = parseInt(params.id, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    await prisma.electionDate.delete({ where: { id } });
    return NextResponse.json({ message: "Election date deleted" });
  } catch (error) {
    console.error("Error deleting election date:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
