"use client";
import React from "react";
import { useRouter } from "next/navigation";
import VoterRecordSearch, {
  type BaseSearchField,
  type SearchField,
} from "./VoterRecordSearch";
import { type DropdownLists, type VoterRecord } from "@prisma/client";
import { VoterRecordTable } from "./VoterRecordTable";
import { getAddress } from "../api/lib/utils";
import { VoterRecordTableSkeleton } from "./VoterRecordTableSkeleton";
import { Button } from "~/components/ui/button";
import { useToast } from "~/components/ui/use-toast";
import { useVoterSearch } from "~/contexts/VoterSearchContext";
import { MAX_RECORDS_FOR_EXPORT } from "~/constants/limits";
import { createSmartFieldsList } from "~/lib/searchFieldUtils";

interface RecordsListProps {
  dropdownList: DropdownLists;
}
export const RecordsList: React.FC<RecordsListProps> = ({ dropdownList }) => {
  const router = useRouter();
  const { toast } = useToast();
  const {
    setSearchQuery: setContextSearchQuery,
    fieldsList: contextFieldsList,
  } = useVoterSearch();
  const [records, setRecords] = React.useState<VoterRecord[]>([]);
  const [totalRecords, setTotalRecords] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState<
    {
      field: string;
      value: string | number | boolean | undefined;
    }[]
  >([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(100);
  const [hasSearched, setHasSearched] = React.useState(false);

  const fieldsList = React.useMemo(() => {
    return createSmartFieldsList(contextFieldsList);
  }, [contextFieldsList]);

  const handleSubmit = async (searchQueryParam: SearchField[]) => {
    setLoading(true);
    setPage(1);
    setPageSize(100);
    const flattenedQuery = searchQueryParam
      .reduce((acc: BaseSearchField[], curr: SearchField) => {
        if (curr.compoundType) {
          return [...acc, ...curr.fields];
        } else {
          return [...acc, curr];
        }
      }, [])
      .map((field) => ({
        field: field.name,
        value:
          field.value instanceof Date ? field.value.toISOString() : field.value,
      }));

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

    setContextSearchQuery(searchQueryParam, flattenedQuery);
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

  const handleExport = () => {
    if (totalRecords > MAX_RECORDS_FOR_EXPORT) {
      toast({
        title: "Too Many Records",
        description: `Cannot export ${totalRecords.toLocaleString()} records. Maximum allowed is ${MAX_RECORDS_FOR_EXPORT.toLocaleString()}.`,
        variant: "destructive",
      });
      return;
    }

    if (totalRecords === 0) {
      toast({
        title: "No Records",
        description: "Please search for voter records first.",
        variant: "destructive",
      });
      return;
    }

    // Navigate to voter list report page (search data is already in context)
    router.push("/voter-list-reports");
  };

  return (
    <div>
      <div className="bg-primary-foreground pt-2">
        <div className="w-full flex justify-center text-2xl text-primary font-bold">
          <h1>Record Search</h1>
        </div>
        <div className="border-grey-400 border-b-2">
          <VoterRecordSearch
            handleSubmit={handleSubmit}
            dropdownList={dropdownList}
          />
        </div>
      </div>
      <div className="w-full flex justify-center text-2xl text-primary font-bold pt-2">
        <h1>Voter Records</h1>
      </div>
      {hasSearched && totalRecords > 0 && (
        <div className="w-full flex justify-center pt-4">
          <Button
            onClick={handleExport}
            disabled={totalRecords > MAX_RECORDS_FOR_EXPORT}
            className="bg-green-600 hover:bg-green-700"
          >
            {totalRecords > MAX_RECORDS_FOR_EXPORT
              ? `Export (${totalRecords.toLocaleString()} records - too many)`
              : `Export ${totalRecords.toLocaleString()} Records`}
          </Button>
        </div>
      )}
      <div className="m-10">
        {loading && <VoterRecordTableSkeleton fieldsList={fieldsList} />}

        {records.length > 0 && !loading && (
          <VoterRecordTable
            records={records}
            fieldsList={fieldsList}
            paginated={true}
            loadMore={handleLoadMore}
            totalRecords={totalRecords}
          />
        )}
      </div>

      {!records.length && hasSearched && (
        <p className="ml-10">No results found.</p>
      )}
      {!records.length && !hasSearched && (
        <p className="ml-10">Sumbit a search query to see results.</p>
      )}
    </div>
  );
};

export const VoterCard = ({
  record,
  committee,
}: {
  record: VoterRecord;
  committee?: boolean;
}) => {
  return (
    <div className="max-w-lg mx-auto bg-white rounded-lg p-4">
      <h2 className="text-xl font-medium text-gray-800 mb-4">
        {`${record.firstName} ${record.lastName}`}
      </h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm text-gray-600 [&>*>p>span]:font-light">
        <div>
          <p>
            <span>Party:</span> {record.party}
          </p>
          <p>
            <span>Gender:</span> {record.gender}
          </p>
          <p>
            <span>DOB:</span>{" "}
            {record.DOB ? new Date(record.DOB).toLocaleDateString() : "-"}
          </p>
          <p>
            <span>Telephone:</span> {record.telephone ?? "-"}
          </p>
          <p className="break-words">
            <span>Email:</span> {record.email ?? "-"}
          </p>
          <p>
            <span>Voter Id:</span> {record.VRCNUM}
          </p>
        </div>
        <div>
          <p>
            <span>Address:</span> {getAddress(record, committee)}
          </p>
          <p>
            <span>City:</span> {record.city}
          </p>
          <p>
            <span>Town:</span> {record.CC_WD_Village ?? "-"}
          </p>
          <p>
            <span>State:</span> {record.state}
          </p>
          <p>
            <span>Zip Code:</span> {record.zipCode}
          </p>
          <p>
            <span>County Leg District:</span> {record.countyLegDistrict}
          </p>
        </div>
      </div>
    </div>
  );
};
