import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export interface CommitteeData {
  cityTown: string;
  legDistrict: string;
  electionDistrict: string;
  memberId: string;
}

// const handler = async (req: NextApiRequest, res: NextApiResponse) => {
export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { cityTown, legDistrict, electionDistrict, memberId }: CommitteeData =
    (await req.json()) as CommitteeData;

  if (
    !cityTown ||
    !legDistrict ||
    !electionDistrict ||
    !memberId ||
    !Number.isInteger(electionDistrict) ||
    !Number.isInteger(legDistrict) ||
    !Number.isInteger(memberId)
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const updatedCommittee = await prisma.committeeList.upsert({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: cityTown,
          legDistrict: Number(legDistrict),
          electionDistrict: Number(electionDistrict),
        },
      },
      update: {
        committeeMemberList: {
          connect: { VRCNUM: Number(memberId) },
        },
      },
      create: {
        cityTown: cityTown,
        legDistrict: Number(legDistrict),
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
