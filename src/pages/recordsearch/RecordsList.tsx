"use client";
import React from "react";
import PartyForm from "./PartyForm";
import { VoterRecord } from "@prisma/client";

export const RecordsList: React.FC = () => {
  const [records, setRecords] = React.useState<any[]>([]);

  const handleSubmit = async (party: string, electionDistrict: string) => {
    const response = await fetch(
      `/api/fetchFilteredData?party=${party}&district=${electionDistrict}`,
    );

    const data = await response.json();

    setRecords(data);
  };

  return (
    <div>
      <PartyForm handleSubmit={handleSubmit} />
      <h1 className="text-foreground">Voter Records</h1>
      {records.length > 0 &&
        records.map((record: VoterRecord, id: any) => {
          return <VoterCard key={id} record={record} />;
        })}
    </div>
  );
};

const VoterCard = ({ record }: { record: VoterRecord }) => {
  return (
    <div className="bg-card p-6">
      <h2 className="mb-4 text-lg font-bold">{`${record.firstName} ${record.lastName}`}</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-foreground">
          <p>Party: {record.party}</p>
          <p>Gender: {record.gender}</p>
          <p>
            DOB: {record.DOB ? new Date(record.DOB).toLocaleDateString() : ""}
          </p>
          <p>Telephone: {record.telephone}</p>
          <p>Email: {record.email}</p>
        </div>
        <div>
          <p>Address: {`${record.houseNum} ${record.street}`}</p>
          <p>City: {record.city}</p>
          <p>State: {record.state}</p>
          <p>Zip Code: {record.zipCode}</p>
          <p>County Leg District: {record.countyLegDistrict}</p>
        </div>
      </div>
    </div>
  );
};
