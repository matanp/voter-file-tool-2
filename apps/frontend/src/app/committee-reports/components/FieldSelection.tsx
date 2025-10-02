import * as React from "react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Separator } from "~/components/ui/separator";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import type { VoterRecordField } from "@voter-file-tool/shared-validators";
import type { XLSXConfigFormData } from "../types";
import { FIELDS_BY_CATEGORY } from "../constants";

interface FieldSelectionProps {
  formData: XLSXConfigFormData;
  onFormDataChange: (updates: Partial<XLSXConfigFormData>) => void;
  errors: Partial<Record<string, string>>;
}

export const FieldSelection: React.FC<FieldSelectionProps> = ({
  formData,
  onFormDataChange,
  errors,
}) => {
  const handleFieldToggle = (fieldKey: VoterRecordField, checked: boolean) => {
    const newIncludeFields = checked
      ? [...formData.includeFields, fieldKey]
      : formData.includeFields.filter((f) => f !== fieldKey);

    onFormDataChange({ includeFields: newIncludeFields });
  };

  const handleSelectAllInCategory = (category: string, checked: boolean) => {
    const categoryFields = FIELDS_BY_CATEGORY[category] ?? [];
    const fieldKeys = categoryFields.map((f) => f.key);

    const newIncludeFields = checked
      ? [...new Set([...formData.includeFields, ...fieldKeys])]
      : formData.includeFields.filter((f) => !fieldKeys.includes(f));

    onFormDataChange({ includeFields: newIncludeFields });
  };

  const isFieldSelected = (fieldKey: VoterRecordField) =>
    formData.includeFields.includes(fieldKey);

  const isCategoryFullySelected = (category: string) => {
    const categoryFields = FIELDS_BY_CATEGORY[category] ?? [];
    return categoryFields.every((field) => isFieldSelected(field.key));
  };

  const isCategoryPartiallySelected = (category: string) => {
    const categoryFields = FIELDS_BY_CATEGORY[category] ?? [];
    const selectedCount = categoryFields.filter((field) =>
      isFieldSelected(field.key),
    ).length;
    return selectedCount > 0 && selectedCount < categoryFields.length;
  };

  // Reusable Select All button component
  const SelectAllButton: React.FC<{ category: string }> = ({ category }) => (
    <Button
      type="button"
      variant={isCategoryFullySelected(category) ? "default" : "outline"}
      size="sm"
      onClick={() =>
        handleSelectAllInCategory(category, !isCategoryFullySelected(category))
      }
      className={`text-xs font-medium transition-colors ${
        isCategoryPartiallySelected(category)
          ? "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
          : ""
      }`}
    >
      {isCategoryFullySelected(category) ? "Deselect All" : "Select All"}
    </Button>
  );

  return (
    <AccordionItem
      value="field-selection"
      className="bg-white rounded-lg shadow-sm"
    >
      <AccordionTrigger className="primary-header text-left bg-white px-6 py-4">
        Field Selection
      </AccordionTrigger>
      <AccordionContent className="space-y-4 bg-white p-6 pt-0 rounded-lg">
        <p className="text-sm text-muted-foreground mb-4">
          Choose which voter record fields to include in the XLSX document
        </p>

        {Object.entries(FIELDS_BY_CATEGORY).map(([category, fields]) => (
          <div key={category} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="primary-header text-lg">{category}</Label>
            </div>

            {/* Add compound field options for specific categories */}
            {category === "Identification" && (
              <div className="ml-6 mb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-name"
                    checked={formData.includeCompoundFields.name}
                    onCheckedChange={(checked) =>
                      onFormDataChange({
                        includeCompoundFields: {
                          ...formData.includeCompoundFields,
                          name: checked === true,
                        },
                      })
                    }
                  />
                  <Label htmlFor="include-name" className="text-sm font-medium">
                    Include name as a unified field
                  </Label>
                </div>
              </div>
            )}

            {category === "Address" && (
              <div className="ml-6 mb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-address"
                    checked={formData.includeCompoundFields.address}
                    onCheckedChange={(checked) =>
                      onFormDataChange({
                        includeCompoundFields: {
                          ...formData.includeCompoundFields,
                          address: checked === true,
                        },
                      })
                    }
                  />
                  <Label
                    htmlFor="include-address"
                    className="text-sm font-medium"
                  >
                    Include address as a unified field
                  </Label>
                </div>
              </div>
            )}

            {/* Add separator line after unified fields - only for sections with unified fields */}
            {(category === "Identification" || category === "Address") && (
              <Separator className="ml-6" />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 ml-6 max-w-4xl">
              <div className="flex items-start justify-end col-start-1 sm:col-start-2 lg:col-start-3 xl:col-start-4 row-start-1">
                <SelectAllButton category={category} />
              </div>
              {fields.map((field) => (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`field-${field.key}`}
                    checked={isFieldSelected(field.key)}
                    onCheckedChange={(checked) =>
                      handleFieldToggle(field.key, checked === true)
                    }
                  />
                  <Label htmlFor={`field-${field.key}`} className="text-sm">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
            <Separator />
          </div>
        ))}
        {errors.includeFields && (
          <p className="text-sm text-destructive">{errors.includeFields}</p>
        )}
      </AccordionContent>
    </AccordionItem>
  );
};
