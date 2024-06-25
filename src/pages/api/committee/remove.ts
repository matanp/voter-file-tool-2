import { ElectionDistrict } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "~/lib/prisma";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { electionDistrict, memberId } = req.body;

  if (!electionDistrict || !memberId) {
    return res.status(400).json({ error: "Invalid request" });
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
      return res.status(404).json({ error: "Committee not found" });
    }

    const voterRecord = await prisma.voterRecord.update({
      where: { VRCNUM: parseInt(memberId) },
      data: {
        committeeId: null,
      },
    });

    res.status(200).json("success");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export default handler;
