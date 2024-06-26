import { NextRequest, NextResponse } from "next/server";
import { parse } from "path";
import prisma from "~/lib/prisma";

export async function GET(req: NextRequest) {
  const electionDistrict = req.nextUrl.searchParams.get("electionDistrict");

  if (
    !electionDistrict ||
    Array.isArray(electionDistrict) ||
    !parseInt(electionDistrict as string)
  ) {
    return NextResponse.json(
      { error: "Invalid election district" },
      { status: 400 },
    );
  }

  try {
    const committee = await prisma.electionDistrict.findUnique({
      where: {
        electionDistrict: parseInt(electionDistrict),
      },
      include: {
        committeeMemberList: true,
      },
    });

    if (!committee) {
      return NextResponse.json(
        { error: "Committee not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(committee, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
