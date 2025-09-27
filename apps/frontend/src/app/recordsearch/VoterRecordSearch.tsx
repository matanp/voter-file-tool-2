"use client";
import type { DropdownLists } from "@prisma/client";
import type { SearchField, SearchFieldValue } from "~/types/searchFields";
import { useState, useCallback, useEffect } from "react";
import { SearchRow } from "~/components/search/SearchRow";
import {
  addIdsIfMissing,
  filterMeaningfulRows,
  getAvailableFields,
  canRemoveRow,
  EMPTY_FIELD,
  assignProcessedFieldValue,
} from "~/lib/searchHelpers";
import { SEARCH_FIELDS } from "~/lib/constants/searchFields";

import { Button } from "~/components/ui/button";

interface VoterRecordSearchProps {
  handleSubmit: (searchQuery: SearchField[]) => Promise<void>;
  dropdownList: DropdownLists;
}

const VoterRecordSearch: React.FC<VoterRecordSearchProps> = (props) => {
  const [searchRows, setSearchRows] = useState<SearchField[]>(() => {
    const initialFieldNames = ["name", "address"];
    return SEARCH_FIELDS.filter((field) =>
      initialFieldNames.includes(field.name),
    ).map((field) => addIdsIfMissing(field));
  });
  const [announcement, setAnnouncement] = useState<string>("");

  const handleChangeField = (
    index: number,
    field: (typeof SEARCH_FIELDS)[number]["name"],
  ) => {
    setSearchRows((prev) => {
      const updatedRows = [...prev];
      const template = SEARCH_FIELDS.find((f) => f.name === field);
      if (template) {
        // structuredClone is widely available in Next runtimes; fallback to JSON if needed
        const newField =
          typeof structuredClone === "function"
            ? structuredClone(template)
            : (JSON.parse(JSON.stringify(template)) as SearchField);

        updatedRows[index] = addIdsIfMissing(newField, updatedRows[index]?.id);
      }
      return updatedRows;
    });
  };

  const handleRemoveRow = (index: number) => {
    if (searchRows.length === 1) {
      setSearchRows([addIdsIfMissing(EMPTY_FIELD)]);
      setAnnouncement("Search criteria cleared. Ready for new search.");
      return;
    }

    const updatedRows = [...searchRows];
    updatedRows.splice(index, 1);
    setSearchRows(updatedRows);
    setAnnouncement(
      `Search criteria ${index + 1} removed. ${updatedRows.length} criteria remaining.`,
    );
  };

  const handleChangeValue = useCallback(
    (index: number, value: SearchFieldValue, compoundIndex?: number) => {
      setSearchRows((prev) => {
        const updatedRows = [...prev];
        const updatedRow = updatedRows[index];

        if (!updatedRow) return prev;

        if (!updatedRow.compoundType) {
          if (updatedRow.value === value) return prev;

          updatedRows[index] = assignProcessedFieldValue(updatedRow, value);
        } else if (compoundIndex !== undefined) {
          const updatedField = updatedRow.fields[compoundIndex];

          if (updatedField && updatedField.value !== value) {
            const processedField = assignProcessedFieldValue(
              updatedField,
              value,
            );
            updatedRow.fields[compoundIndex] = processedField;
            updatedRows[index] = updatedRow;
          }
        }
        return updatedRows;
      });
    },
    [],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const filteredRows = filterMeaningfulRows(searchRows);
    props.handleSubmit(filteredRows).catch((error) => {
      console.error("Error submitting search:", error);
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to submit
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        const filteredRows = filterMeaningfulRows(searchRows);
        props.handleSubmit(filteredRows).catch((error) => {
          console.error("Error submitting search:", error);
        });
      }

      // Ctrl+Plus or Cmd+Plus to add new criteria
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === "+" || event.key === "=")
      ) {
        event.preventDefault();
        const newRows = [...searchRows, addIdsIfMissing(EMPTY_FIELD)];
        setSearchRows(newRows);
        setAnnouncement(
          `New search criteria added. Total: ${newRows.length} criteria.`,
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchRows, props]);

  return (
    <div className="flex justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-max flex flex-col items-center gap-4"
        role="search"
        aria-label="Voter record search form"
      >
        <fieldset className="border-0 p-0 m-0">
          <legend className="sr-only">Search criteria</legend>
          {searchRows.map((row, index) => {
            const availableFields = getAvailableFields(
              searchRows,
              SEARCH_FIELDS,
              row.name,
            );
            const canRemove = canRemoveRow(searchRows, index);

            return (
              <SearchRow
                key={row.id ?? `fallback-key-${index}`}
                row={row}
                index={index}
                dropdownList={props.dropdownList}
                availableFields={availableFields}
                onFieldChange={handleChangeField}
                onValueChange={handleChangeValue}
                onRemoveRow={handleRemoveRow}
                canRemove={canRemove}
              />
            );
          })}
        </fieldset>

        <div
          className="flex items-center gap-4 pb-8"
          role="group"
          aria-label="Search actions"
        >
          <Button
            type="button"
            onClick={() => {
              const newRows = [...searchRows, addIdsIfMissing(EMPTY_FIELD)];
              setSearchRows(newRows);
              setAnnouncement(
                `New search criteria added. Total: ${newRows.length} criteria.`,
              );
            }}
            aria-label="Add another search criteria"
            title="Add another search criteria (Ctrl+Plus)"
          >
            Add Search Criteria
          </Button>

          <div className="py-2">
            <Button
              type="submit"
              className="hover:bg-primary-700 w-full rounded-md border border-transparent bg-primary px-4 py-2 text-primary-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Submit voter record search"
              title="Submit search (Ctrl+Enter)"
            >
              Submit
            </Button>
          </div>
        </div>
      </form>

      {/* Screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {announcement}
      </div>
    </div>
  );
};

export default VoterRecordSearch;
