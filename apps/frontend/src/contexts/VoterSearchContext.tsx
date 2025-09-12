"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import type { SearchField } from "~/app/recordsearch/VoterRecordSearch";

interface VoterSearchContextType {
  searchQuery: SearchField[];
  flattenedSearchQuery: {
    field: string;
    value: string | number | boolean | Date | undefined;
  }[];
  setSearchQuery: (
    query: SearchField[],
    flattenedQuery: {
      field: string;
      value: string | number | boolean | Date | undefined;
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
      value: string | number | boolean | Date | undefined;
    }[]
  >([]);

  const setSearchQuery = useCallback(
    (
      query: SearchField[],
      flattenedQuery: {
        field: string;
        value: string | number | boolean | Date | undefined;
      }[],
    ) => {
      // Only update if we have actual data, don't overwrite with empty arrays
      if (query.length > 0 && flattenedQuery.length > 0) {
        console.log("VoterSearchContext - setting search query:", query);
        console.log(
          "VoterSearchContext - setting flattened query:",
          flattenedQuery,
        );
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

  const value = {
    searchQuery,
    flattenedSearchQuery,
    setSearchQuery,
    clearSearchQuery,
  };

  return (
    <VoterSearchContext.Provider value={value}>
      {children}
    </VoterSearchContext.Provider>
  );
};
