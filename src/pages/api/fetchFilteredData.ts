import { NextApiRequest, NextApiResponse } from "next";
import prisma from "~/lib/prisma";

export default async function fetchFilteredData(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const { party, district } = req.query;

    if (
      !party ||
      !district ||
      typeof party !== "string" ||
      typeof district !== "string"
    ) {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    const records = await prisma.voterRecord.findMany({
      where: {
        party,
        electionDistrict: Number(district),
      },
    });

    const data = records;

    res.status(200).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
