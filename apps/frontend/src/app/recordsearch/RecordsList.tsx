"use client";
import React from "react";
import VoterRecordSearch, {
  type BaseSearchField,
  type SearchField,
} from "./VoterRecordSearch";
import { type DropdownLists, type VoterRecord } from "@prisma/client";
import { VoterRecordTable } from "./VoterRecordTable";

interface RecordsListProps {
  dropdownList: DropdownLists;
}
export const RecordsList: React.FC<RecordsListProps> = ({ dropdownList }) => {
  const [records, setRecords] = React.useState<VoterRecord[]>([]);
  const [totalRecords, setTotalRecords] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState<
    {
      field: string;
      value: string | number | Date | undefined;
    }[]
  >([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(100);
  const [hasSearched, setHasSearched] = React.useState(false);

  const handleSubmit = async (searchQuery: SearchField[]) => {
    setLoading(true);
    setPage(1);
    setPageSize(100);
    const flattenedQuery = searchQuery
      .reduce((acc: BaseSearchField[], curr: SearchField) => {
        if (curr.compoundType) {
          return [...acc, ...curr.fields];
        } else {
          return [...acc, curr];
        }
      }, [])
      .map((field) => ({ field: field.name, value: field.value }));

    setSearchQuery(flattenedQuery);

    const response = await fetch(`/api/fetchFilteredData`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        searchQuery: flattenedQuery,
        pageSize: 100,
        page: 1,
      }),
    });

    const { data, totalRecords } = (await response.json()) as {
      data: VoterRecord[];
      totalRecords: number;
    };

    setTotalRecords(totalRecords);
    setRecords(data);
    setLoading(false);
    setHasSearched(true);
  };

  const handleLoadMore = async () => {
    const response = await fetch(`/api/fetchFilteredData`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        searchQuery,
        pageSize,
        page: page + 1,
      }),
    });
    const { data } = (await response.json()) as {
      data: VoterRecord[];
    };
    setRecords((prevRecords) => [...prevRecords, ...data]);
    setPage((prevPage) => prevPage + 1);
  };

  return (
    <div>
      <VoterRecordSearch
        handleSubmit={handleSubmit}
        dropdownList={dropdownList}
      />
      <div className="flex m-10">
        <h1 className="text-foreground text-lg">Voter Records</h1>
        {loading && <div>{"   "}...loading...</div>}
      </div>
      {records.length > 0 && (
        <div className="m-10">
          <VoterRecordTable
            records={records}
            fieldsList={["DOB", "Telephone"]}
            paginated={true}
            loadMore={handleLoadMore}
            totalRecords={totalRecords}
          />
        </div>
      )}
      {!records.length && hasSearched && (
        <p className="ml-10">No results found.</p>
      )}
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
          <p>Voter Id: {record.VRCNUM}</p>
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
