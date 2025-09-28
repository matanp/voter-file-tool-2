import { useState, useCallback, useMemo } from "react";
import type { SearchField, SearchFieldValue } from "~/types/searchFields";
import type { SearchQueryField } from "@voter-file-tool/shared-validators";
import { SEARCH_FIELDS } from "~/lib/constants/searchFields";
import { SEARCH_CONFIG } from "./searchConfiguration";
import { SearchFieldProcessor } from "./searchFieldProcessor";
import {
  addIdsIfMissing,
  filterMeaningfulRows,
  EMPTY_FIELD,
} from "./searchHelpers";
import { useAnnouncementHandlers } from "./searchEventHandlers";
import {
  isBaseSearchField,
  isCompoundSearchField,
  isValidSearchFieldUpdate,
  hasMeaningfulSearchValue,
} from "./searchFieldTypeGuards";
import { useVoterSearch } from "~/contexts/VoterSearchContext";

/**
 * Helper function to compare SearchFieldValue objects for equality.
 * Handles Date objects and other complex types properly.
 */
function isValueEqual(a: SearchFieldValue, b: SearchFieldValue): boolean {
  // Handle undefined/null cases
  if (a === undefined && b === undefined) return true;
  if (a === null && b === null) return true;
  if (a === undefined || b === undefined) return false;
  if (a === null || b === null) return false;

  // Handle Date objects
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (a instanceof Date || b instanceof Date) return false;

  // Handle DateRange objects
  if (
    typeof a === "object" &&
    typeof b === "object" &&
    a !== null &&
    b !== null
  ) {
    // Check if both are DateRange objects
    const aIsDateRange = "startDate" in a || "endDate" in a;
    const bIsDateRange = "startDate" in b || "endDate" in b;

    if (aIsDateRange && bIsDateRange) {
      const aRange = a as { startDate?: Date; endDate?: Date };
      const bRange = b as { startDate?: Date; endDate?: Date };

      // Compare startDate
      if (aRange.startDate && bRange.startDate) {
        if (aRange.startDate.getTime() !== bRange.startDate.getTime())
          return false;
      } else if (aRange.startDate || bRange.startDate) {
        return false;
      }

      // Compare endDate
      if (aRange.endDate && bRange.endDate) {
        if (aRange.endDate.getTime() !== bRange.endDate.getTime()) return false;
      } else if (aRange.endDate || bRange.endDate) {
        return false;
      }

      return true;
    }

    // If one is DateRange and the other isn't, they're not equal
    if (aIsDateRange || bIsDateRange) return false;
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => isValueEqual(item, b[index]));
  }
  if (Array.isArray(a) || Array.isArray(b)) return false;

  // Handle primitive types
  return a === b;
}

/**
 * Local search form state management hook.
 * Handles the internal state of search form rows and values.
 */
export const useLocalSearchState = () => {
  // Initialize with default fields from configuration
  const [searchRows, setSearchRows] = useState<SearchField[]>(() => {
    return SEARCH_FIELDS.filter((field) =>
      (SEARCH_CONFIG.initialFields as readonly string[]).includes(field.name),
    ).map((field) => addIdsIfMissing(field));
  });

  // Use announcement handlers hook
  const { announcement, ...announcementHandlers } = useAnnouncementHandlers();

  /**
   * Updates a specific search row with the provided updates.
   */
  const updateSearchRow = useCallback(
    (index: number, updates: Partial<SearchField>) => {
      setSearchRows((prev) => {
        const newRows = prev.map((row, i) => {
          if (i === index) {
            // Use type guard to validate updates
            if (isValidSearchFieldUpdate(updates)) {
              return updates;
            } else {
              // If updates are invalid, merge safely while preserving type
              if (isBaseSearchField(row)) {
                return { ...row, ...updates } as SearchField;
              } else if (isCompoundSearchField(row)) {
                return { ...row, ...updates } as SearchField;
              }
            }
          }
          return row;
        });

        // Only update if there's actually a change
        const hasChanged = newRows.some((newRow, i) => {
          const oldRow = prev[i];
          if (!oldRow) return true;

          // Compare base fields
          if (isBaseSearchField(newRow) && isBaseSearchField(oldRow)) {
            return (
              !isValueEqual(newRow.value, oldRow.value) ||
              newRow.name !== oldRow.name ||
              newRow.type !== oldRow.type
            );
          }

          // Compare compound fields
          if (isCompoundSearchField(newRow) && isCompoundSearchField(oldRow)) {
            return (
              newRow.name !== oldRow.name ||
              newRow.fields.length !== oldRow.fields.length ||
              newRow.fields.some((newField, fieldIndex) => {
                const oldField = oldRow.fields[fieldIndex];
                return (
                  !oldField ||
                  !isValueEqual(newField.value, oldField.value) ||
                  newField.name !== oldField.name ||
                  newField.type !== oldField.type
                );
              })
            );
          }

          // Type mismatch
          return true;
        });

        return hasChanged ? newRows : prev;
      });
    },
    [],
  );

  /**
   * Adds a new empty search row.
   */
  const addSearchRow = useCallback(() => {
    setSearchRows((prev) => {
      const newRows = [...prev, addIdsIfMissing(EMPTY_FIELD)];
      announcementHandlers.announceCriteriaAdded(newRows.length);
      return newRows;
    });
  }, [announcementHandlers]);

  /**
   * Removes a search row at the specified index.
   */
  const removeSearchRow = useCallback(
    (index: number) => {
      setSearchRows((prev) => {
        if (prev.length === 1) {
          announcementHandlers.announceCriteriaCleared();
          return [addIdsIfMissing(EMPTY_FIELD)];
        }

        const updatedRows = [...prev];
        updatedRows.splice(index, 1);
        announcementHandlers.announceCriteriaRemoved(index, updatedRows.length);
        return updatedRows;
      });
    },
    [announcementHandlers],
  );

  /**
   * Changes the field type for a specific search row.
   */
  const changeField = useCallback(
    (index: number, fieldName: (typeof SEARCH_FIELDS)[number]["name"]) => {
      setSearchRows((prev) => {
        const updatedRows = [...prev];
        const template = SEARCH_FIELDS.find((f) => f.name === fieldName);

        if (template) {
          // Use structuredClone if available, fallback to JSON for compatibility
          const newField =
            typeof structuredClone === "function"
              ? structuredClone(template)
              : (JSON.parse(JSON.stringify(template)) as SearchField);

          updatedRows[index] = addIdsIfMissing(
            newField,
            updatedRows[index]?.id,
          );
        }

        return updatedRows;
      });
    },
    [],
  );

  /**
   * Changes the value for a specific search row.
   * Optimized with early returns and better state management.
   */
  const changeValue = useCallback(
    (index: number, value: SearchFieldValue, compoundIndex?: number) => {
      setSearchRows((prev) => {
        const updatedRow = prev[index];
        if (!updatedRow) return prev;

        // Early return if value hasn't changed - improved comparison
        if (!updatedRow.compoundType) {
          if (isValueEqual(updatedRow.value, value)) return prev;
        } else if (compoundIndex !== undefined) {
          const targetField = updatedRow.fields[compoundIndex];
          if (targetField && isValueEqual(targetField.value, value))
            return prev;
        }

        // Use JSON parse/stringify for deep updates to avoid mutation (Jest compatible)
        const newRows = JSON.parse(JSON.stringify(prev)) as SearchField[];
        const targetRow = newRows[index];

        if (!targetRow) return prev;

        if (!targetRow.compoundType) {
          // Handle simple field
          const processedValue = SearchFieldProcessor.normalizeForStorage(
            value,
            targetRow,
          );
          targetRow.value = processedValue;
        } else if (compoundIndex !== undefined) {
          // Handle compound field
          const targetField = targetRow.fields[compoundIndex];
          if (targetField) {
            const processedValue = SearchFieldProcessor.normalizeForStorage(
              value,
              targetField,
            );
            targetField.value = processedValue;
          }
        }

        return newRows;
      });
    },
    [],
  );

  /**
   * Submits the search by filtering meaningful rows.
   */
  const submitSearch = useCallback(
    (rows: SearchField[] = searchRows) => {
      return filterMeaningfulRows(rows);
    },
    [searchRows],
  );

  /**
   * Clears all search criteria.
   */
  const clearSearch = useCallback(() => {
    setSearchRows([addIdsIfMissing(EMPTY_FIELD)]);
    announcementHandlers.announceCriteriaCleared();
  }, [announcementHandlers]);

  /**
   * Sets the search rows directly (useful for context integration).
   */
  const setSearchRowsDirect = useCallback((rows: SearchField[]) => {
    setSearchRows(rows);
  }, []);

  return {
    // State
    searchRows,
    announcement,

    // Actions
    updateSearchRow,
    addSearchRow,
    removeSearchRow,
    changeField,
    changeValue,
    submitSearch,
    clearSearch,
    setSearchRowsDirect,

    // Computed values
    hasSearchCriteria: useMemo(
      () => searchRows.some((row) => hasMeaningfulSearchValue(row)),
      [searchRows],
    ),
    searchRowsCount: searchRows.length,
  };
};

/**
 * Type for the return value of useLocalSearchState hook.
 */
export type LocalSearchState = ReturnType<typeof useLocalSearchState>;

/**
 * Converts a SearchField to SearchQueryField using the unified processor.
 */
const convertSearchFieldToQueryField = (
  field: SearchField,
): SearchQueryField | null => {
  if (field.compoundType) {
    // For compound fields, process each sub-field
    const queryFields: SearchQueryField[] = [];
    for (const subField of field.fields) {
      const queryField = SearchFieldProcessor.convertToQueryField(subField);
      if (queryField) {
        queryFields.push(queryField);
      }
    }
    return queryFields.length > 0 ? queryFields[0]! : null; // Return first valid field
  } else {
    // For simple fields, use the unified processor
    return SearchFieldProcessor.convertToQueryField(field);
  }
};

/**
 * Hook that integrates search state with VoterSearchContext.
 * Ensures compatibility between local state management and global context.
 */
export const useSearchStateWithContext = (
  searchState: ReturnType<typeof useLocalSearchState>,
) => {
  const { setSearchQuery: setContextSearchQuery, clearSearchQuery } =
    useVoterSearch();

  /**
   * Syncs the search state with the context when search is submitted.
   */
  const syncWithContext = useCallback(
    (searchRows: SearchField[]) => {
      // Convert SearchField[] to SearchQueryField[] for context compatibility
      const flattenedQuery: SearchQueryField[] = searchRows
        .map((row) => convertSearchFieldToQueryField(row))
        .filter((field): field is SearchQueryField => field !== null);

      // Update context with both formats
      setContextSearchQuery(searchRows, flattenedQuery);
    },
    [setContextSearchQuery],
  );

  /**
   * Clears both local state and context.
   */
  const clearAll = useCallback(() => {
    searchState.clearSearch();
    clearSearchQuery();
  }, [searchState, clearSearchQuery]);

  /**
   * Submits search and syncs with context.
   */
  const submitSearchWithContext = useCallback(
    (searchRows: SearchField[] = searchState.searchRows) => {
      const filteredRows = searchState.submitSearch(searchRows);
      syncWithContext(filteredRows);
      return filteredRows;
    },
    [searchState, syncWithContext],
  );

  return {
    ...searchState,
    syncWithContext,
    clearAll,
    submitSearchWithContext,
  };
};

/**
 * Main search state hook with context integration.
 * This is the primary hook to use in components.
 */
export const useSearchState = () => {
  const localState = useLocalSearchState();
  return useSearchStateWithContext(localState);
};

/**
 * Type for the main search state hook.
 */
export type SearchState = ReturnType<typeof useSearchState>;
