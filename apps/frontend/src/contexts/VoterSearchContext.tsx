"use client";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { SearchField } from "~/types/searchFields";
import { extractFieldNamesFromSearchQuery } from "~/lib/searchFieldUtils";
import type { FieldName } from "~/app/recordsearch/fieldsConfig";
import type { SearchQueryField } from "@voter-file-tool/shared-validators";

interface VoterSearchContextType {
  searchQuery: SearchField[];
  flattenedSearchQuery: SearchQueryField[];
  fieldsList: FieldName[];
  setSearchQuery: (
    query: SearchField[],
    flattenedQuery: SearchQueryField[],
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
    SearchQueryField[]
  >([]);
  const [fieldsList, setFieldsList] = useState<FieldName[]>([]);

  const setSearchQuery = useCallback(
    (query: SearchField[], flattenedQuery: SearchQueryField[]) => {
      // Early exit if both arrays are empty and current state is already empty
      if (
        query.length === 0 &&
        flattenedQuery.length === 0 &&
        searchQuery.length === 0 &&
        flattenedSearchQuery.length === 0
      ) {
        return;
      }

      setSearchQueryState(query);
      setFlattenedSearchQuery(flattenedQuery);
      const extractedFields = extractFieldNamesFromSearchQuery(query);
      setFieldsList(extractedFields);
    },
    [searchQuery, flattenedSearchQuery],
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
