import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SearchField,
  SearchFieldValue,
  BaseSearchField,
  DateOfBirthValue,
} from "~/types/searchFields";
import { SEARCH_CONFIG } from "./searchConfiguration";
import { SearchFieldProcessor } from "./searchFieldProcessor";
import type { SearchState } from "./useSearchState";

/**
 * Hook for creating submit handlers for search functionality.
 */
export const useSubmitHandler = (
  searchState: SearchState,
  onSubmit: (filteredRows: SearchField[]) => Promise<void>,
  isAuthenticated: boolean,
) => {
  return useCallback(
    (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();

      if (!isAuthenticated) {
        return;
      }

      const filteredRows = searchState.submitSearch(searchState.searchRows);
      onSubmit(filteredRows).catch((error) => {
        console.error("Error submitting search:", error);
      });
    },
    [searchState, onSubmit, isAuthenticated],
  );
};

/**
 * Hook for creating keyboard shortcut handlers for search functionality.
 */
export const useKeyboardHandlers = (
  searchState: SearchState,
  onSubmit: (filteredRows: SearchField[]) => Promise<void>,
  isAuthenticated: boolean,
) => {
  const handleSubmit = useSubmitHandler(searchState, onSubmit, isAuthenticated);

  return useCallback(
    (event: KeyboardEvent) => {
      const { submit, addCriteria } = SEARCH_CONFIG.keyboardShortcuts;

      // Submit shortcut (Ctrl+Enter or Cmd+Enter)
      if (
        (event.ctrlKey || event.metaKey) === submit.ctrl &&
        event.key === submit.key
      ) {
        event.preventDefault();
        handleSubmit();
        return;
      }

      // Add criteria shortcut (Ctrl+Shift+Plus or Cmd+Shift+Plus)
      if (
        (event.ctrlKey || event.metaKey) === addCriteria.ctrl &&
        event.shiftKey === addCriteria.shift &&
        (event.key === addCriteria.key || event.key === "=")
      ) {
        event.preventDefault();
        searchState.addSearchRow();
        return;
      }
    },
    [handleSubmit, searchState],
  );
};

/**
 * Hook for creating field change handlers for SearchRow components.
 */
export const useFieldChangeHandlers = (searchState: SearchState) => {
  const handleFieldChange = useCallback(
    (index: number, fieldName: string) => {
      searchState.changeField(index, fieldName);
    },
    [searchState],
  );

  const handleValueChange = useCallback(
    (index: number, value: SearchFieldValue, compoundIndex?: number) => {
      searchState.changeValue(index, value, compoundIndex);
    },
    [searchState],
  );

  const handleRemoveRow = useCallback(
    (index: number) => {
      searchState.removeSearchRow(index);
    },
    [searchState],
  );

  return {
    handleFieldChange,
    handleValueChange,
    handleRemoveRow,
  };
};

/**
 * Hook for creating input change handlers for different field types.
 */
export const useInputHandlers = (
  onValueChange: (value: SearchFieldValue) => void,
  field: BaseSearchField,
) => {
  const handleStringInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const processedValue = SearchFieldProcessor.normalizeForStorage(
        e.target.value,
        field,
      );
      onValueChange(processedValue);
    },
    [onValueChange, field],
  );

  const handleNumberInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const processedValue = SearchFieldProcessor.normalizeForStorage(
        e.target.value,
        field,
      );
      onValueChange(processedValue);
    },
    [onValueChange, field],
  );

  const handleCheckboxChange = useCallback(
    (checked: boolean | "indeterminate") => {
      const processedValue = SearchFieldProcessor.normalizeForStorage(
        checked,
        field,
      );
      onValueChange(processedValue);
    },
    [onValueChange, field],
  );

  const handleDateChange = useCallback(
    (date: Date | undefined) => {
      const processedValue = SearchFieldProcessor.normalizeForStorage(
        date,
        field,
      );
      onValueChange(processedValue);
    },
    [onValueChange, field.name, field.type],
  );

  const handleDateRangeChange = useCallback(
    (range: { startDate?: Date; endDate?: Date }) => {
      const processedValue = SearchFieldProcessor.normalizeForStorage(
        range,
        field,
      );
      onValueChange(processedValue);
    },
    [onValueChange, field.name, field.type],
  );

  const handleDropdownChange = useCallback(
    (value: string | string[]) => {
      const processedValue = SearchFieldProcessor.normalizeForStorage(
        value,
        field,
      );
      onValueChange(processedValue);
    },
    [onValueChange, field],
  );

  const handleMultiStringChange = useCallback(
    (values: string[]) => {
      const processedValue = SearchFieldProcessor.normalizeForStorage(
        values,
        field,
      );
      onValueChange(processedValue);
    },
    [onValueChange, field],
  );

  const handleDateOfBirthChange = useCallback(
    (value: DateOfBirthValue) => {
      const processedValue = SearchFieldProcessor.normalizeForStorage(
        value,
        field,
      );
      onValueChange(processedValue);
    },
    [onValueChange, field.name, field.type],
  );

  return {
    handleStringInputChange,
    handleNumberInputChange,
    handleCheckboxChange,
    handleDateChange,
    handleDateRangeChange,
    handleDateOfBirthChange,
    handleDropdownChange,
    handleMultiStringChange,
  };
};

/**
 * Hook for creating announcement handlers for accessibility.
 * Manages its own announcement state internally.
 */
export const useAnnouncementHandlers = (): {
  announcement: string;
  announceCriteriaAdded: (totalCount: number) => void;
  announceCriteriaRemoved: (index: number, remainingCount: number) => void;
  announceCriteriaCleared: () => void;
} => {
  const [announcement, setAnnouncement] = useState<string>("");

  const announceCriteriaAdded = useCallback((totalCount: number) => {
    const message = SEARCH_CONFIG.announcements.criteriaAdded(totalCount);
    setAnnouncement(message);
  }, []);

  const announceCriteriaRemoved = useCallback(
    (index: number, remainingCount: number) => {
      const message = SEARCH_CONFIG.announcements.criteriaRemoved(
        index,
        remainingCount,
      );
      setAnnouncement(message);
    },
    [],
  );

  const announceCriteriaCleared = useCallback(() => {
    const message = SEARCH_CONFIG.announcements.criteriaCleared;
    setAnnouncement(message);
  }, []);

  return {
    announcement,
    announceCriteriaAdded,
    announceCriteriaRemoved,
    announceCriteriaCleared,
  };
};

/**
 * Hook for managing keyboard shortcuts with proper cleanup.
 */
export const useKeyboardShortcuts = (
  handlers: ReturnType<typeof useKeyboardHandlers>,
) => {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handlersRef.current(event);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
};

/**
 * Hook for managing form submission with proper error handling.
 */
export const useFormSubmission = (
  onSubmit: (filteredRows: SearchField[]) => Promise<void>,
  searchState: SearchState,
  isAuthenticated: boolean,
) => {
  const handleSubmit = useSubmitHandler(searchState, onSubmit, isAuthenticated);

  const handleFormSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      handleSubmit(event);
    },
    [handleSubmit],
  );

  return {
    handleSubmit,
    handleFormSubmit,
  };
};

/**
 * Utility function to create consistent aria labels and titles.
 */
export const createAccessibilityProps = (
  type: "addCriteria" | "submitSearch" | "removeCriteria",
  isAuthenticated?: boolean,
  index?: number,
) => {
  switch (type) {
    case "addCriteria":
      return {
        "aria-label": SEARCH_CONFIG.ariaLabels.addCriteria,
        title: SEARCH_CONFIG.titles.addCriteria,
      };
    case "submitSearch":
      return {
        "aria-label": SEARCH_CONFIG.ariaLabels.submitSearch(
          isAuthenticated ?? false,
        ),
        title: SEARCH_CONFIG.titles.submitSearch(isAuthenticated ?? false),
      };
    case "removeCriteria":
      return {
        "aria-label": SEARCH_CONFIG.ariaLabels.removeCriteria(index ?? 0),
        title: SEARCH_CONFIG.titles.removeCriteria,
      };
    default:
      return {};
  }
};
