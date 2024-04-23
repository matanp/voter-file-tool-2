import { authenticatePb, pbClient } from '@/app/lib/connect';
import { NextApiRequest, NextApiResponse } from 'next';
import pb from 'pocketbase';

export default async function fetchFilteredData(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { party, district } = req.query;

    await authenticatePb();

    const filterString = `Party = "${party}" && ElectionDistrict = ${district}`;

    const records = await pbClient.collection('Voter_Records').getList(1, 100, {
      filter: pbClient.filter(filterString),
    });

    console.log(records.items[0]);

    const data = records.items;

    res.status(200).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
