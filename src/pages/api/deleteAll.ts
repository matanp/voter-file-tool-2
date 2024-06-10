import { NextApiRequest, NextApiResponse } from "next";
import PocketBase from "pocketbase";

const POCKETBASE_URL = "http://127.0.0.1:8090";
const COLLECTION_NAME = "Voter_Records";
const ADMIN_EMAIL = process.env.PB_USERNAME ?? "";
const ADMIN_PASSWORD = process.env.PB_PASSWORD ?? "";

const pb = new PocketBase(POCKETBASE_URL);

async function authenticateAdmin(email: string, password: string) {
  await pb.admins.authWithPassword(email, password);
}

async function fetchAllRecords(
  collectionName: string,
  page: number = 1,
  perPage: number = 100,
) {
  const records = await pb.collection(collectionName).getList(page, perPage);
  return records.items;
}

async function deleteRecord(
  collectionName: string,
  recordId: string,
): Promise<void> {
  await pb.collection(collectionName).delete(recordId);
}

async function deleteAllRecords(collectionName: string): Promise<void> {
  let page = 1;
  let records;

  do {
    records = await fetchAllRecords(collectionName, page);
    if (records.length === 0) break;

    for (const record of records) {
      await deleteRecord(collectionName, record.id);
      console.log(`Deleted record with ID ${record.id}`);
    }

    page++;
  } while (records.length > 0);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "DELETE") {
    try {
      await authenticateAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
      await deleteAllRecords(COLLECTION_NAME);
      res.status(200).json({ message: "All records deleted successfully" });
    } catch (error) {
      console.error("Error deleting records:", error);
      res.status(500).json({ error: "Error deleting records" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
