import { FieldRenderer } from "./FieldRenderer";
import type {
  SearchField,
  BaseSearchField,
  SearchFieldValue,
} from "~/types/searchFields";
import type { DropdownLists } from "@prisma/client";
import { SEARCH_CONFIG, FIELD_CONFIG } from "~/lib/searchConfiguration";

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
        if (subField.type === SEARCH_CONFIG.fieldTypes.HIDDEN) return null;

        const shouldShowLabel =
          subField.name !== FIELD_CONFIG.cityFieldName &&
          subField.type !== SEARCH_CONFIG.fieldTypes.BOOLEAN &&
          subField.displayName.length <
            SEARCH_CONFIG.displayThresholds.mediumLabel;

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
