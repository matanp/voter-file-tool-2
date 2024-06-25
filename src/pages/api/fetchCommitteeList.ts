import { NextApiRequest, NextApiResponse } from "next";
import { parse } from "path";
import prisma from "~/lib/prisma";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { electionDistrict } = req.query;

  if (
    !electionDistrict ||
    Array.isArray(electionDistrict) ||
    !parseInt(electionDistrict as string)
  ) {
    return res.status(400).json({ error: "Invalid election district" });
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
      return res.status(404).json({ error: "Committee not found" });
    }

    res.status(200).json(committee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export default handler;
