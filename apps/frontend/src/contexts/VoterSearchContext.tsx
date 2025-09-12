"use client";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { SearchField } from "~/app/recordsearch/VoterRecordSearch";
import { extractFieldNamesFromSearchQuery } from "~/lib/searchFieldUtils";
import type { FieldName } from "~/app/recordsearch/fieldsConfig";

interface VoterSearchContextType {
  searchQuery: SearchField[];
  flattenedSearchQuery: {
    field: string;
    value: string | number | boolean | undefined;
  }[];
  fieldsList: FieldName[];
  setSearchQuery: (
    query: SearchField[],
    flattenedQuery: {
      field: string;
      value: string | number | boolean | undefined;
    }[],
  ) => void;
  clearSearchQuery: () => void;
}

const VoterSearchContext = createContext<VoterSearchContextType | undefined>(
  undefined,
);

export const useVoterSearch = () => {
  const context = useContext(VoterSearchContext);
  if (context === undefined) {
    throw new Error("useVoterSearch must be used within a VoterSearchProvider");
  }
  return context;
};

interface VoterSearchProviderProps {
  children: React.ReactNode;
}

export const VoterSearchProvider: React.FC<VoterSearchProviderProps> = ({
  children,
}) => {
  const [searchQuery, setSearchQueryState] = useState<SearchField[]>([]);
  const [flattenedSearchQuery, setFlattenedSearchQuery] = useState<
    {
      field: string;
      value: string | number | boolean | undefined;
    }[]
  >([]);
  const [fieldsList, setFieldsList] = useState<FieldName[]>([]);

  const setSearchQuery = useCallback(
    (
      query: SearchField[],
      flattenedQuery: {
        field: string;
        value: string | number | boolean | undefined;
      }[],
    ) => {
      // Only update if we have actual data, don't overwrite with empty arrays
      if (query.length > 0 && flattenedQuery.length > 0) {
        setSearchQueryState(query);
        setFlattenedSearchQuery(flattenedQuery);
        const extractedFields = extractFieldNamesFromSearchQuery(query);
        setFieldsList(extractedFields);
      }
    },
    [],
  );

  const clearSearchQuery = useCallback(() => {
    setSearchQueryState([]);
    setFlattenedSearchQuery([]);
    setFieldsList([]);
  }, []);

  const value = useMemo(
    () => ({
      searchQuery,
      flattenedSearchQuery,
      fieldsList,
      setSearchQuery,
      clearSearchQuery,
    }),
    [
      clearSearchQuery,
      flattenedSearchQuery,
      searchQuery,
      setSearchQuery,
      fieldsList,
    ],
  );

  return (
    <VoterSearchContext.Provider value={value}>
      {children}
    </VoterSearchContext.Provider>
  );
};
