"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import VoterRecordSearch from "./VoterRecordSearch";
import { type DropdownLists, type VoterRecord } from "@prisma/client";
import { type VoterRecordAPI } from "@voter-file-tool/shared-validators";
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
import type { SearchField } from "~/types/searchFields";
import { SearchFieldProcessor } from "~/lib/searchFieldProcessor";
import { createSmartFieldsList } from "~/lib/searchFieldUtils";
import { scrollToElement } from "~/lib/scrollUtils";
import { Info } from "lucide-react";
import { useApiMutation } from "~/hooks/useApiMutation";
import { useContext } from "react";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { PrivilegeLevel } from "@prisma/client";
import { hasPermissionFor } from "~/lib/utils";

const LOADING_SECTION_ID = "loading-section";

interface RecordsListProps {
  dropdownList: DropdownLists;
}

// Type-safe conversion using discriminated union properly

export const RecordsList: React.FC<RecordsListProps> = ({ dropdownList }) => {
  const router = useRouter();
  const { toast } = useToast();
  const { status } = useSession();
  const { actingPermissions } = useContext(GlobalContext);
  const {
    setSearchQuery: setContextSearchQuery,
    fieldsList: contextFieldsList,
  } = useVoterSearch();
  const [records, setRecords] = React.useState<VoterRecordAPI[]>([]);
  const [totalRecords, setTotalRecords] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState<SearchQueryField[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(100);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [isHoveringInfo, setIsHoveringInfo] = React.useState(false);

  // API mutation hooks
  const searchMutation = useApiMutation<
    {
      data: VoterRecordAPI[];
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
      data: VoterRecordAPI[];
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

  const canExport = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);

  const handleSubmit = React.useCallback(
    async (searchQueryParam: SearchField[]) => {
      setPage(1);
      setPageSize(100);

      const flattenedQuery =
        SearchFieldProcessor.convertSearchFieldsToSearchQuery(searchQueryParam);

      setSearchQuery(flattenedQuery);

      void searchMutation.mutate({
        searchQuery: flattenedQuery,
        pageSize: 100,
        page: 1,
      });

      setContextSearchQuery(searchQueryParam, flattenedQuery);

      setTimeout(() => {
        scrollToElement(LOADING_SECTION_ID);
      }, 100);
    },
    [searchMutation, setContextSearchQuery],
  );

  const handleLoadMore = React.useCallback(async () => {
    void loadMoreMutation.mutate({
      searchQuery: searchQuery,
      pageSize,
      page: page + 1,
    });
  }, [loadMoreMutation, searchQuery, pageSize, page]);

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
    // Use setTimeout to ensure navigation happens after any pending state updates
    setTimeout(() => {
      router.push("/voter-list-reports");
    }, 0);
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
            isAuthenticated={status === "authenticated"}
          />
        </div>
      </div>
      <div className="w-full flex justify-center text-2xl text-primary font-bold pt-2">
        <h1>Voter Records</h1>
      </div>
      {hasSearched && totalRecords > 0 && canExport && (
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
          <VoterRecordTableSkeleton
            fieldsList={fieldsList}
            scrollId={LOADING_SECTION_ID}
          />
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

      {!records.length && !searchMutation.loading && (
        <p className="ml-10">
          {hasSearched
            ? "No results found."
            : status === "authenticated"
              ? "Submit a search query to see results."
              : "Please log in to search voter records."}
        </p>
      )}
    </div>
  );
};

export const VoterCard = ({
  record,
  committee,
}: {
  record: VoterRecordAPI;
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
