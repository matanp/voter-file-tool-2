import { NextApiRequest, NextApiResponse } from "next";
import { authenticatePb, pbClient } from "~/lib/connect";
import { readFileSync } from "fs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await authenticatePb();
  // if (req.method !== 'POST') {
  //   return res.status(405).json({
  //     error: 'Method Not Allowed',
  //     message: 'Only POST requests are allowed.',
  //   });
  // }

  try {
    const fileContent: Buffer = readFileSync("data/CDL_DAT.txt");

    const data = fileContent.toString().split("\n");

    for (let i = 0; i < data.length; i++) {
      let voterRecord = {};
      for (let key of Object.keys(testData)) {
        if (
          key === "VRCNUM" ||
          key === "HouseNum" ||
          key === "ElectionDistrict"
        ) {
          voterRecord = {
            ...voterRecord,
            [key]: Number(
              data[i]
                ?.split(",")
                [Object.keys(testData).indexOf(key)]?.replace(/"/g, "") ?? -1,
            ),
          };
        } else {
          voterRecord = {
            ...voterRecord,
            [key]: (
              (data[i] ?? "").split(",")[Object.keys(testData).indexOf(key)] ??
              ""
            )
              .replace(/"/g, "")
              .trim(),
          };
        }
      }

      await pbClient.collection("Voter_Records").create(voterRecord);
    }

    return res.status(200).json({
      success: true,
      message: "Data loaded successfully.",
      result: "",
    });
  } catch (error) {
    console.error("Error loading data:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "Failed to load data.",
    });
  }
}

const testData = {
  VRCNUM: 123,
  LastName: "test",
  FirstName: "test",
  MiddleInitial: "test",
  SuffixName: "test",
  HouseNum: 123,
  Street: "test",
  Apartment: "test",
  HalfAddress: "test",
  ResAddrLine2: "test",
  ResAddrLine3: "test",
  City: "test",
  State: "test",
  ZipCode: "test",
  ZipSuffix: "test",
  Telephone: "test",
  Email: "test",
  MailingAddress1: "test",
  MailingAddress2: "test",
  MailingAddress3: "test",
  MailingAddress4: "test",
  MailingCity: "test",
  MailingState: "test",
  MailingZip: "test",
  MailingZipSuffix: "test",
  Party: "test",
  Gender: "test",
  DOB: "test",
  L_T: "test",
  ElectionDistrict: "test",
  CountyLegDistrict: "test",
  StateAssmblyDistrict: "test",
  StateSenateDistrict: "test",
  CongressionalDistrict: "test",
  CC_WD_Village: "test",
  TownCode: "test",
  LastUpdate: "test",
  OriginalRegDate: "test",
  Statevid: "test",
  VotingJune19: "test",
  VotingNov19: "test",
  VotingApr20: "test",
  VotingJune20: "test",
  VotingNov20: "test",
  VotingJune21: "test",
  VotingNov21: "test",
  VotingJune22: "test",
  VotingNov22: "test",
  VotingJune23: "test",
  VotingNov23: "test",
};
