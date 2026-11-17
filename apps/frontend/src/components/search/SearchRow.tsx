import React, { useCallback } from "react";
import { Button } from "~/components/ui/button";
import { ComboboxDropdown } from "~/components/ui/ComboBox";
import { FieldRenderer } from "./FieldRenderer";
import { CompoundFieldRenderer } from "./CompoundFieldRenderer";
import type { SearchFieldValue } from "~/types/searchFields";
import { SEARCH_CONFIG } from "~/lib/searchConfiguration";
import type { SearchRowComponentProps } from "~/lib/searchRowTypes";
import { createAccessibilityProps } from "~/lib/searchEventHandlers";

export const SearchRow: React.FC<SearchRowComponentProps> = ({
  row,
  index,
  dropdownList,
  availableFields,
  onFieldChange,
  onValueChange,
  onRemoveRow,
  canRemove,
}) => {
  const handleFieldChange = useCallback(
    (value: string) => {
      onFieldChange(index, value);
    },
    [onFieldChange, index],
  );

  const handleValueChange = useCallback(
    (value: SearchFieldValue, compoundIndex?: number) => {
      onValueChange(index, value, compoundIndex);
    },
    [onValueChange, index],
  );

  const handleRemoveClick = useCallback(
    () => onRemoveRow(index),
    [onRemoveRow, index],
  );

  const removeButtonProps = createAccessibilityProps(
    "removeCriteria",
    undefined,
    index,
  );

  return (
    <div
      // Below sm: a grid with the field picker and remove button on the first line and the value
      // input full-width under them. From sm: picker, value and remove button side by side.
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 bg-background p-4 shadow-md sm:flex sm:items-stretch sm:gap-4"
      role="group"
      aria-label={SEARCH_CONFIG.ariaLabels.searchCriteria(index)}
    >
      {/* Below sm its children join the grid above; from sm it's one flexible row. */}
      <div className="contents sm:m-2 sm:flex sm:min-w-0 sm:flex-1 sm:flex-row sm:gap-4">
        {/* Field selector */}
        <div className="flex flex-row items-center">
          <label htmlFor={`field-selector-${index}`} className="sr-only">
            Select search field for criteria {index + 1}
          </label>
          <ComboboxDropdown
            id={`field-selector-${index}`}
            items={availableFields as Array<{ label: string; value: string }>}
            initialValue={row.name}
            displayLabel={row.displayName}
            onSelect={handleFieldChange}
            ariaLabel={`Select search field for criteria ${index + 1}`}
          />
        </div>

        {/* Value input */}
        <div className="col-span-2 min-w-0">
          {!row.compoundType && row.name !== "empty" && (
            <FieldRenderer
              field={row}
              dropdownList={dropdownList}
              onValueChange={handleValueChange}
              index={index}
            />
          )}

          {row.compoundType && (
            <CompoundFieldRenderer
              field={row}
              dropdownList={dropdownList}
              onValueChange={handleValueChange}
              rowIndex={index}
            />
          )}
        </div>
      </div>

      {/* Remove button */}
      {canRemove && (
        <div className="col-start-2 row-start-1 flex flex-row items-center">
          <Button
            variant="destructive"
            onClick={handleRemoveClick}
            title={SEARCH_CONFIG.titles.removeCriteria}
            aria-label={removeButtonProps["aria-label"]}
            type="button"
          >
            <span aria-hidden="true">×</span>
            <span className="sr-only">Remove</span>
          </Button>
        </div>
      )}
    </div>
  );
};
