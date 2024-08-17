"use client";
import React from "react";
import VoterRecordSearch, {
  type BaseSearchField,
  type SearchField,
} from "./VoterRecordSearch";
import { DropdownLists, type VoterRecord } from "@prisma/client";

interface RecordsListProps {
  dropdownList: DropdownLists;
}
export const RecordsList: React.FC<RecordsListProps> = ({ dropdownList }) => {
  const [records, setRecords] = React.useState<VoterRecord[]>([]);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (searchQuery: SearchField[]) => {
    setLoading(true);
    const flattenedQuery = searchQuery
      .reduce((acc: BaseSearchField[], curr: SearchField) => {
        if (curr.compoundType) {
          return [...acc, ...curr.fields];
        } else {
          return [...acc, curr];
        }
      }, [])
      .map((field) => ({ field: field.name, value: field.value }));

    const response = await fetch(`/api/fetchFilteredData`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(flattenedQuery),
    });

    const data: unknown = await response.json();

    setRecords(data as VoterRecord[]);
    setLoading(false);
  };

  return (
    <div>
      <VoterRecordSearch
        handleSubmit={handleSubmit}
        dropdownList={dropdownList}
      />
      <div className="flex">
        <h1 className="text-foreground">Voter Records</h1>
        {loading && <div>{"   "}...loading...</div>}
      </div>
      {records.length > 0 &&
        records.map((record: VoterRecord, id: number) => {
          return <VoterCard key={id} record={record} />;
        })}
    </div>
  );
};

export const VoterCard = ({ record }: { record: VoterRecord }) => {
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
