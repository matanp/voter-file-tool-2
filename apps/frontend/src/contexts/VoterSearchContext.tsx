"use client";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { SearchField } from "~/app/recordsearch/VoterRecordSearch";

interface VoterSearchContextType {
  searchQuery: SearchField[];
  flattenedSearchQuery: {
    field: string;
    value: string | number | boolean | undefined;
  }[];
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
      }
    },
    [],
  );

  const clearSearchQuery = useCallback(() => {
    setSearchQueryState([]);
    setFlattenedSearchQuery([]);
  }, []);

  const value = useMemo(
    () => ({
      searchQuery,
      flattenedSearchQuery,
      setSearchQuery,
      clearSearchQuery,
    }),
    [clearSearchQuery, flattenedSearchQuery, searchQuery, setSearchQuery],
  );

  return (
    <VoterSearchContext.Provider value={value}>
      {children}
    </VoterSearchContext.Provider>
  );
};
