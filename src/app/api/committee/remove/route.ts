import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { CommitteeData } from "../add/route";

// const handler = async (req: NextApiRequest, res: NextApiResponse) => {
export async function POST(req: NextRequest) {
  // const { electionDistrict, memberId } = req.body;
  const { cityTown, legDistrict, electionDistrict, memberId }: CommitteeData =
    (await req.json()) as CommitteeData;

  if (
    !cityTown ||
    !legDistrict ||
    !electionDistrict ||
    !memberId ||
    !Number.isInteger(electionDistrict) ||
    !Number(legDistrict) ||
    !Number.isInteger(memberId)
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const existingElectionDistrict = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: cityTown,
          legDistrict: parseInt(legDistrict, 10),
          electionDistrict: parseInt(electionDistrict, 10),
        },
      },
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
