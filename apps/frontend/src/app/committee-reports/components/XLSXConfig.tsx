import * as React from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import type { XLSXConfigFormData } from "../types";
import { FIELDS_BY_KEY } from "../constants";

interface XLSXConfigProps {
  formData: XLSXConfigFormData;
  onFormDataChange: (updates: Partial<XLSXConfigFormData>) => void;
}

export const XLSXConfig: React.FC<XLSXConfigProps> = ({
  formData,
  onFormDataChange,
}) => {
  const handleColumnHeaderChange = (fieldKey: string, value: string) => {
    onFormDataChange({
      columnHeaders: {
        ...formData.columnHeaders,
        [fieldKey]: value,
      },
    });
  };

  if (formData.includeFields.length === 0) {
    return null;
  }

  return (
    <AccordionItem
      value="xlsx-config"
      className="bg-white rounded-lg shadow-sm"
    >
      <AccordionTrigger className="primary-header text-left bg-white px-6 py-4">
        Custom Field Names
      </AccordionTrigger>
      <AccordionContent className="space-y-4 bg-white p-6 pt-0 rounded-lg">
        <p className="text-sm text-muted-foreground mb-4">
          Customize column headers for the selected fields
        </p>
        {/* Column Headers */}
        <div className="space-y-2">
          <Label>Custom Column Headers (Optional)</Label>
          <div className="space-y-2 max-w-2xl">
            {formData.includeFields.map((fieldKey) => {
              const field = FIELDS_BY_KEY[fieldKey];
              return (
                <div key={fieldKey} className="flex items-center space-x-2">
                  <Label
                    htmlFor={`header-${fieldKey}`}
                    className="w-32 text-sm flex-shrink-0"
                  >
                    {field?.label ?? fieldKey}:
                  </Label>
                  <Input
                    id={`header-${fieldKey}`}
                    value={formData.columnHeaders[fieldKey] ?? ""}
                    onChange={(e) =>
                      handleColumnHeaderChange(fieldKey, e.target.value)
                    }
                    placeholder={field?.label ?? fieldKey}
                    className="flex-1"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
