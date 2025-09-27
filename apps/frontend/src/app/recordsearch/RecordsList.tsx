"use client";
import React from "react";
import { useRouter } from "next/navigation";
import VoterRecordSearch from "./VoterRecordSearch";
import { type DropdownLists, type VoterRecord } from "@prisma/client";
import { VoterRecordTable } from "./VoterRecordTable";
import { getAddress } from "../api/lib/utils";
import { VoterRecordTableSkeleton } from "./VoterRecordTableSkeleton";
import { Button } from "~/components/ui/button";
import { useToast } from "~/components/ui/use-toast";
import { useVoterSearch } from "~/contexts/VoterSearchContext";
import {
  MAX_RECORDS_FOR_EXPORT,
  ADMIN_CONTACT_INFO,
  type SearchQueryField,
} from "@voter-file-tool/shared-validators";
import type { BaseSearchField, SearchField } from "~/types/searchFields";
import { convertBaseSearchFieldToSearchQueryField } from "~/types/searchFields";
import { createSmartFieldsList } from "~/lib/searchFieldUtils";
import { Info } from "lucide-react";
import { useApiMutation } from "~/hooks/useApiMutation";

interface RecordsListProps {
  dropdownList: DropdownLists;
}

// Type-safe conversion using discriminated union properly

export const RecordsList: React.FC<RecordsListProps> = ({ dropdownList }) => {
  const router = useRouter();
  const { toast } = useToast();
  const {
    setSearchQuery: setContextSearchQuery,
    fieldsList: contextFieldsList,
  } = useVoterSearch();
  const [records, setRecords] = React.useState<VoterRecord[]>([]);
  const [totalRecords, setTotalRecords] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState<SearchQueryField[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(100);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [isHoveringInfo, setIsHoveringInfo] = React.useState(false);

  // API mutation hooks
  const searchMutation = useApiMutation<
    {
      data: VoterRecord[];
      totalRecords: number;
    },
    {
      searchQuery: SearchQueryField[];
      pageSize: number;
      page: number;
    }
  >("/api/fetchFilteredData", "POST", {
    onSuccess: (data) => {
      setRecords(data.data);
      setTotalRecords(data.totalRecords);
      setHasSearched(true);
    },
    onError: (error) => {
      console.error("Search failed:", error);
      setRecords([]);
      setTotalRecords(0);
    },
  });

  const loadMoreMutation = useApiMutation<
    {
      data: VoterRecord[];
      totalRecords: number;
    },
    {
      searchQuery: SearchQueryField[];
      pageSize: number;
      page: number;
    }
  >("/api/fetchFilteredData", "POST", {
    onSuccess: (data) => {
      setRecords((prev) => [...prev, ...data.data]);
      setPage((prev) => prev + 1);
    },
    onError: (error) => {
      console.error("Load more failed:", error);
    },
  });

  const fieldsList = React.useMemo(() => {
    return createSmartFieldsList(contextFieldsList);
  }, [contextFieldsList]);

  const handleSubmit = async (searchQueryParam: SearchField[]) => {
    setPage(1);
    setPageSize(100);

    // Flatten compound fields and convert to SearchQueryField format
    const flattenedQuery = searchQueryParam
      .flatMap<BaseSearchField>((curr) =>
        curr.compoundType ? curr.fields : [curr],
      )
      .map(convertBaseSearchFieldToSearchQueryField)
      .filter((field): field is SearchQueryField => field !== null);

    setSearchQuery(flattenedQuery);

    void searchMutation.mutate({
      searchQuery: flattenedQuery,
      pageSize: 100,
      page: 1,
    });

    setContextSearchQuery(searchQueryParam, flattenedQuery);
  };

  const handleLoadMore = async () => {
    void loadMoreMutation.mutate({
      searchQuery: searchQuery,
      pageSize,
      page: page + 1,
    });
  };

  const handleExport = () => {
    if (totalRecords > MAX_RECORDS_FOR_EXPORT) {
      toast({
        title: "Too Many Records",
        description: `Cannot export ${totalRecords.toLocaleString()} records. Maximum allowed is ${MAX_RECORDS_FOR_EXPORT.toLocaleString()}. ${ADMIN_CONTACT_INFO}`,
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
        <div className="w-full flex flex-col items-center pt-4 space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleExport}
              disabled={totalRecords > MAX_RECORDS_FOR_EXPORT}
              className="bg-primary hover:bg-primary/90"
            >
              {totalRecords > MAX_RECORDS_FOR_EXPORT
                ? `Export (${totalRecords.toLocaleString()} records - too many)`
                : `Export ${totalRecords.toLocaleString()} Records`}
            </Button>
            {totalRecords > MAX_RECORDS_FOR_EXPORT && (
              <div className="relative">
                <Info
                  className="h-5 w-5 text-amber-600 cursor-help"
                  onMouseEnter={() => setIsHoveringInfo(true)}
                  onMouseLeave={() => setIsHoveringInfo(false)}
                  onClick={() => setIsHoveringInfo(!isHoveringInfo)}
                />
                {isHoveringInfo && (
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 w-96 p-4 bg-amber-50 border border-amber-200 rounded-md shadow-lg">
                    <p className="text-sm text-amber-800 font-medium text-center">
                      Large Export Request
                    </p>
                    <p className="text-sm text-amber-700 mt-1 text-center">
                      {ADMIN_CONTACT_INFO}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="m-10">
        {searchMutation.loading && (
          <VoterRecordTableSkeleton fieldsList={fieldsList} />
        )}

        {records.length > 0 && !searchMutation.loading && (
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
        <p className="ml-10">Submit a search query to see results.</p>
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
