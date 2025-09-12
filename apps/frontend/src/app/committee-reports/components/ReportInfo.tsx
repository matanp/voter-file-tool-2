import * as React from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import type { XLSXConfigFormData } from "../types";

interface ReportInfoProps {
  formData: XLSXConfigFormData;
  onFormDataChange: (updates: Partial<XLSXConfigFormData>) => void;
  errors: Partial<Record<string, string>>;
}

export const ReportInfo: React.FC<ReportInfoProps> = ({
  formData,
  onFormDataChange,
  errors,
}) => {
  return (
    <AccordionItem
      value="report-info"
      className="bg-white rounded-lg shadow-sm"
    >
      <AccordionTrigger className="primary-header text-left bg-white px-6 py-4">
        Report Information
      </AccordionTrigger>
      <AccordionContent className="space-y-4 bg-white p-6 pt-0 rounded-lg">
        <p className="text-sm text-muted-foreground mb-4">
          Basic information about the report to be generated
        </p>
        <div className="space-y-2">
          <Label htmlFor="name">Report Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => {
              onFormDataChange({ name: e.target.value });
            }}
            placeholder="Enter report name"
            required
            aria-describedby={errors.name ? "name-error" : undefined}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p id="name-error" className="text-sm text-red-500">
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => onFormDataChange({ description: e.target.value })}
            placeholder="Enter report description (optional)"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="format">Format</Label>
          <Select
            value={formData.format}
            onValueChange={(value: "pdf" | "xlsx") => {
              onFormDataChange({ format: value });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="xlsx">XLSX (Excel)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
