import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";

interface CommitteeData {
  electionDistrict: string;
  memberId: string;
}

// const handler = async (req: NextApiRequest, res: NextApiResponse) => {
export async function POST(req: NextRequest) {
  // const { electionDistrict, memberId } = req.body;
  const { electionDistrict, memberId }: CommitteeData = await req.json() as CommitteeData;

  if (!electionDistrict || !memberId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    // const updatedCommittee = await prisma.electionDistrict.upsert({
    //   where: { electionDistrict: parseInt(electionDistrict, 10) },
    //   update: {
    //     committeeMemberList: {
    //       connect: { VRCNUM: parseInt(memberId, 10) },
    //     },
    //   },
    //   create: {
    //     electionDistrict: parseInt(electionDistrict, 10),
    //     committeeMemberList: {
    //       connect: { VRCNUM: parseInt(memberId, 10) },
    //     },
    //   },
    //   include: {
    //     committeeMemberList: true,
    //   },
    // });

    const existingElectionDistrict = await prisma.electionDistrict.findUnique({
      where: { electionDistrict: parseInt(electionDistrict) },
      include: { committeeMemberList: true },
    });

    if (!existingElectionDistrict) {
      return NextResponse.json(
        { error: "Committee not found" },
        { status: 404 },
      );
    }

     await prisma.voterRecord.update({
      where: { VRCNUM: parseInt(memberId) },
      data: {
        committeeId: null,
      },
    });

    return NextResponse.json("success", { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
