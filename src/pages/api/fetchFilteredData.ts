import { VoterRecord } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "~/lib/prisma";

function isKeyOfVoterRecord(key: string): key is keyof VoterRecord {
  // return [
  //   "firstName",
  //   "lastName",
  //   "party",
  //   "gender",
  //   "DOB",
  //   "telephone",
  //   "email",
  //   "houseNum",
  //   "street",
  //   "city",
  //   "state",
  //   "zipCode",
  //   "countyLegDistrict",
  //   "address",
  //   "phone",
  // ].includes(key);

  // :OHNO: do this for real
  return true;
}

export default async function fetchFilteredData(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const searchQuery = req.body;

    let query: Partial<VoterRecord> = {};

    for (const field of searchQuery) {
      if (field.value !== "" && field.value !== null) {
        let fieldField = field.field;
        if (isKeyOfVoterRecord(fieldField)) {
          if (fieldField === "firstName" || fieldField === "lastName") {
            query[fieldField] = field.value.toUpperCase();
          } else {
            query[fieldField] = field.value;
          }
        }
      }
    }

    if (!searchQuery) {
      return res.status(400).json({ error: "Missing search query" });
    }

    const records = await prisma.voterRecord.findMany({
      where: query,
    });

    console.log(records.length);

    const data = records.slice(0, 10);

    res.status(200).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
