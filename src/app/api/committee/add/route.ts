import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import prisma from "~/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// const handler = async (req: NextApiRequest, res: NextApiResponse) => {
export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  // const { electionDistrict, memberId } = req.body;
  const { electionDistrict, memberId } = await req.json();

  if (!electionDistrict || !memberId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const updatedCommittee = await prisma.electionDistrict.upsert({
      where: { electionDistrict: parseInt(electionDistrict, 10) },
      update: {
        committeeMemberList: {
          connect: { VRCNUM: parseInt(memberId, 10) },
        },
      },
      create: {
        electionDistrict: parseInt(electionDistrict, 10),
        committeeMemberList: {
          connect: { VRCNUM: parseInt(memberId, 10) },
        },
      },
      include: {
        committeeMemberList: true,
      },
    });

    return NextResponse.json(updatedCommittee, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
