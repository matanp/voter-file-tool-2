import { Button } from "~/components/ui/button";
import { ComboboxDropdown } from "~/components/ui/ComboBox";
import { FieldRenderer } from "./FieldRenderer";
import { CompoundFieldRenderer } from "./CompoundFieldRenderer";
import type { SearchField, SearchFieldValue } from "~/types/searchFields";
import type { DropdownLists } from "@prisma/client";

interface SearchRowProps {
  row: SearchField;
  index: number;
  dropdownList: DropdownLists;
  availableFields: Array<{ label: string; value: string }>;
  onFieldChange: (index: number, fieldName: string) => void;
  onValueChange: (
    index: number,
    value: SearchFieldValue,
    compoundIndex?: number,
  ) => void;
  onRemoveRow: (index: number) => void;
  canRemove: boolean;
}

export const SearchRow: React.FC<SearchRowProps> = ({
  row,
  index,
  dropdownList,
  availableFields,
  onFieldChange,
  onValueChange,
  onRemoveRow,
  canRemove,
}) => {
  const handleFieldChange = (value: string) => {
    onFieldChange(index, value);
  };

  const handleValueChange = (
    value: SearchFieldValue,
    compoundIndex?: number,
  ) => {
    onValueChange(index, value, compoundIndex);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onRemoveRow(index);
  };

  return (
    <div
      key={row.id ?? `fallback-key-${index}`}
      className="flex gap-4 shadow-md p-4 bg-background"
      role="group"
      aria-label={`Search criteria ${index + 1}`}
    >
      <div className="m-2">
        <div className="flex gap-4">
          {/* Field selector */}
          <div className="flex flex-row items-center">
            <label htmlFor={`field-selector-${index}`} className="sr-only">
              Select search field for criteria {index + 1}
            </label>
            <ComboboxDropdown
              items={availableFields}
              initialValue={row.name}
              displayLabel={row.displayName}
              onSelect={handleFieldChange}
              ariaLabel={`Select search field for criteria ${index + 1}`}
            />
          </div>

          {/* Value input */}
          <div className="col-sm-4">
            {!row.compoundType && row.name !== "empty" && (
              <FieldRenderer
                field={row}
                dropdownList={dropdownList}
                onValueChange={(value) => handleValueChange(value)}
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
      </div>

      {/* Remove button */}
      {canRemove && (
        <div className="col-sm-2 flex flex-row items-center">
          <Button
            variant="destructive"
            onClick={handleRemoveClick}
            title="Remove Search Criteria"
            aria-label={`Remove search criteria ${index + 1}`}
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
