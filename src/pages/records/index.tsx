"use client";
import React from "react";
import { authenticatePb, pbClient } from "~/lib/connect";
// import PartyForm from "~/components/PartyForm";

const View: React.FC = () => {
  const [records, setRecords] = React.useState<any[]>([]);
  // const records = await pbClient.collection('Voter_Records').getList(1, 10);

  const handleSubmit = async (party: string, electionDistrict: string) => {
    const response = await fetch(
      `/api/fetchFilteredData?party=${party}&district=${electionDistrict}`,
    );

    console.log(response);

    const data = await response.json();
    setRecords(data);
  };

  return (
    <div>
      {/* <PartyForm handleSubmit={handleSubmit} /> */}
      <h1>Voter Records</h1>
      {records.length > 0 &&
        records.map((record: any, id: any) => {
          // return (
          //   <div className="flex gap-2" key={id}>
          //     <h1>{record.id}</h1>
          //     <p>{record.VRCNUM}</p>
          //     <p>{record.LastName}</p>
          //     <p>{record.VotingJune19}</p>
          //   </div>);
          return <VoterCard key={id} data={record} />;
        })}
    </div>
  );
};

export default View;

const VoterCard = ({ data }: any) => {
  return (
    <div className="rounded-lg bg-black p-6 shadow-lg">
      <h2 className="mb-4 text-lg font-bold">{`${data.FirstName} ${data.LastName}`}</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-600">Party: {data.Party}</p>
          <p className="text-gray-600">Gender: {data.Gender}</p>
          <p className="text-gray-600">DOB: {data.DOB}</p>
          <p className="text-gray-600">Telephone: {data.Telephone}</p>
          <p className="text-gray-600">Email: {data.Email}</p>
        </div>
        <div>
          <p className="text-gray-600">
            Address: {`${data.HouseNum} ${data.Street}`}
          </p>
          <p className="text-gray-600">City: {data.City}</p>
          <p className="text-gray-600">State: {data.State}</p>
          <p className="text-gray-600">Zip Code: {data.ZipCode}</p>
          <p className="text-gray-600">
            County Leg District: {data.CountyLegDistrict}
          </p>
        </div>
      </div>
    </div>
  );
};
