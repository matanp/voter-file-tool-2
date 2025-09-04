import { NextResponse } from "next/server";
import prisma from "~/lib/prisma";

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = parseInt(params.id, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    await prisma.officeName.delete({ where: { id } });
    return NextResponse.json({ message: "Election Offce deleted" });
  } catch (error) {
    console.error("Error deleting election date:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
