"use client";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
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

  // Track empty state using refs to avoid dependency changes
  const isEmptyRef = useRef({ search: true, flat: true });

  const setSearchQuery = useCallback(
    (query: SearchField[], flattenedQuery: SearchQueryField[]) => {
      const nextEmpty = query.length === 0 && flattenedQuery.length === 0;
      const currEmpty = isEmptyRef.current.search && isEmptyRef.current.flat;

      // Early exit if both arrays are empty and current state is already empty
      if (nextEmpty && currEmpty) {
        return;
      }

      setSearchQueryState(query);
      setFlattenedSearchQuery(flattenedQuery);
      const extractedFields = extractFieldNamesFromSearchQuery(query);
      setFieldsList(extractedFields);

      // Update ref to track current empty state
      isEmptyRef.current = {
        search: query.length === 0,
        flat: flattenedQuery.length === 0,
      };
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
