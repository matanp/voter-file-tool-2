import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
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

    res.status(200).json(updatedCommittee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export default handler;
