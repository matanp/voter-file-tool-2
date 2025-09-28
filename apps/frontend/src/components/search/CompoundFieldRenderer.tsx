import { FieldRenderer } from "./FieldRenderer";
import type {
  SearchField,
  BaseSearchField,
  SearchFieldValue,
} from "~/types/searchFields";
import type { DropdownLists } from "@prisma/client";
import {
  FIELD_TYPES,
  FIELD_NAMES,
  DISPLAY_LABEL_THRESHOLDS,
} from "~/lib/searchHelpers";

export interface CompoundFieldRendererProps {
  field: SearchField;
  dropdownList: DropdownLists;
  onValueChange: (value: SearchFieldValue, subIndex: number) => void;
  rowIndex: number;
}

export const CompoundFieldRenderer: React.FC<CompoundFieldRendererProps> = ({
  field,
  dropdownList,
  onValueChange,
  rowIndex,
}) => {
  if (!field.compoundType || !field.fields) {
    return null;
  }

  return (
    <>
      {field.fields.map((subField: BaseSearchField, subIndex) => {
        if (subField.type === FIELD_TYPES.HIDDEN) return null;

        const shouldShowLabel =
          subField.name !== FIELD_NAMES.CITY &&
          subField.type !== FIELD_TYPES.BOOLEAN &&
          subField.displayName.length < DISPLAY_LABEL_THRESHOLDS.MEDIUM_LABEL;

        return (
          <div
            key={subField.id ?? `sub-fallback-${rowIndex}-${subIndex}`}
            className="flex flex-col"
          >
            {shouldShowLabel && (
              <label className="font-extralight text-sm pl-1 pt-2">
                {subField.displayName}
              </label>
            )}
            <FieldRenderer
              field={subField}
              dropdownList={dropdownList}
              onValueChange={(value) => onValueChange(value, subIndex)}
              index={rowIndex}
              subIndex={subIndex}
            />
          </div>
        );
      })}
    </>
  );
};
