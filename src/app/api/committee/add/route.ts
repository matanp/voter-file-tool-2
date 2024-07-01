import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

interface CommitteeData {
  electionDistrict: string;
  memberId: string;
}

// const handler = async (req: NextApiRequest, res: NextApiResponse) => {
export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { electionDistrict, memberId }: CommitteeData = await req.json() as CommitteeData;

  if (!electionDistrict || !memberId || !Number.isInteger(electionDistrict) || !Number.isInteger(memberId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const updatedCommittee = await prisma.electionDistrict.upsert({
      where: { electionDistrict: Number(electionDistrict) },
      update: {
        committeeMemberList: {
          connect: { VRCNUM: Number(memberId) },
        },
      },
      create: {
        electionDistrict: Number(electionDistrict),
        committeeMemberList: {
          connect: { VRCNUM: Number(memberId) },
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
