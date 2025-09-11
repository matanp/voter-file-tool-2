"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { useToast } from "~/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { ReportStatusTracker } from "~/app/components/ReportStatusTracker";
import type { VoterRecordField } from "@voter-file-tool/shared-validators";
import { mapCommitteesToReportShapeWithFields } from "../committees/committeeUtils";
import type { CommitteeWithMembers } from "../committees/committeeUtils";

// Available VoterRecord fields for selection
const AVAILABLE_FIELDS: {
  key: VoterRecordField;
  label: string;
  category: string;
}[] = [
  // Basic identification fields
  {
    key: "VRCNUM",
    label: "Voter Registration Number",
    category: "Identification",
  },
  { key: "lastName", label: "Last Name", category: "Identification" },
  { key: "firstName", label: "First Name", category: "Identification" },
  { key: "middleInitial", label: "Middle Initial", category: "Identification" },
  { key: "suffixName", label: "Suffix Name", category: "Identification" },

  // Address fields
  { key: "houseNum", label: "House Number", category: "Address" },
  { key: "street", label: "Street", category: "Address" },
  { key: "apartment", label: "Apartment", category: "Address" },
  { key: "halfAddress", label: "Half Address", category: "Address" },
  {
    key: "resAddrLine2",
    label: "Residence Address Line 2",
    category: "Address",
  },
  {
    key: "resAddrLine3",
    label: "Residence Address Line 3",
    category: "Address",
  },
  { key: "city", label: "City", category: "Address" },
  { key: "state", label: "State", category: "Address" },
  { key: "zipCode", label: "ZIP Code", category: "Address" },
  { key: "zipSuffix", label: "ZIP Suffix", category: "Address" },

  // Contact information
  { key: "telephone", label: "Telephone", category: "Contact" },
  { key: "email", label: "Email", category: "Contact" },

  // Mailing address
  {
    key: "mailingAddress1",
    label: "Mailing Address 1",
    category: "Mailing Address",
  },
  {
    key: "mailingAddress2",
    label: "Mailing Address 2",
    category: "Mailing Address",
  },
  {
    key: "mailingAddress3",
    label: "Mailing Address 3",
    category: "Mailing Address",
  },
  {
    key: "mailingAddress4",
    label: "Mailing Address 4",
    category: "Mailing Address",
  },
  { key: "mailingCity", label: "Mailing City", category: "Mailing Address" },
  { key: "mailingState", label: "Mailing State", category: "Mailing Address" },
  { key: "mailingZip", label: "Mailing ZIP", category: "Mailing Address" },
  {
    key: "mailingZipSuffix",
    label: "Mailing ZIP Suffix",
    category: "Mailing Address",
  },

  // Political information
  { key: "party", label: "Party", category: "Political" },
  { key: "gender", label: "Gender", category: "Political" },
  { key: "DOB", label: "Date of Birth", category: "Political" },
  { key: "L_T", label: "L_T", category: "Political" },

  // District information
  {
    key: "electionDistrict",
    label: "Election District",
    category: "Districts",
  },
  {
    key: "countyLegDistrict",
    label: "County Legislative District",
    category: "Districts",
  },
  {
    key: "stateAssmblyDistrict",
    label: "State Assembly District",
    category: "Districts",
  },
  {
    key: "stateSenateDistrict",
    label: "State Senate District",
    category: "Districts",
  },
  {
    key: "congressionalDistrict",
    label: "Congressional District",
    category: "Districts",
  },
  { key: "CC_WD_Village", label: "CC_WD_Village", category: "Districts" },
  { key: "townCode", label: "Town Code", category: "Districts" },

  // Other fields
  {
    key: "originalRegDate",
    label: "Original Registration Date",
    category: "Other",
  },
  { key: "statevid", label: "State VID", category: "Other" },
  {
    key: "addressForCommittee",
    label: "Address for Committee",
    category: "Other",
  },
];

// Group fields by category
const FIELDS_BY_CATEGORY = AVAILABLE_FIELDS.reduce(
  (acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category]!.push(field);
    return acc;
  },
  {} as Record<string, typeof AVAILABLE_FIELDS>,
);

interface XLSXConfigFormData {
  name: string;
  description: string;
  format: "pdf" | "xlsx";
  selectedFields: VoterRecordField[];
  includeCompoundFields: {
    name: boolean;
    address: boolean;
  };
  columnOrder: string[];
  columnHeaders: Record<string, string>;
}

const DEFAULT_FORM_DATA: XLSXConfigFormData = {
  name: "",
  description: "",
  format: "xlsx",
  selectedFields: [],
  includeCompoundFields: {
    name: true,
    address: true,
  },
  columnOrder: [],
  columnHeaders: {},
};

interface XLSXConfigFormProps {
  committeeLists: CommitteeWithMembers[];
}

export const XLSXConfigForm: React.FC<XLSXConfigFormProps> = ({
  committeeLists,
}) => {
  const { toast } = useToast();
  const router = useRouter();
  const [formData, setFormData] =
    useState<XLSXConfigFormData>(DEFAULT_FORM_DATA);
  const [reportId, setReportId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  // Handle report completion
  const handleReportComplete = (_url: string) => {
    toast({
      description:
        "Document generated successfully! Download will start shortly.",
      duration: 5000,
    });
    // Trigger download
    // window.open(url, "_blank");
    setIsGenerating(false);
    setReportId(null);
  };

  // Handle report error
  const handleReportError = (errorMessage: string) => {
    toast({
      variant: "destructive",
      title: "Generation Failed",
      description: errorMessage || "Failed to generate document",
      duration: 5000,
    });
    setIsGenerating(false);
    setReportId(null);
  };

  const handleFieldToggle = (fieldKey: VoterRecordField, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      selectedFields: checked
        ? [...prev.selectedFields, fieldKey]
        : prev.selectedFields.filter((f) => f !== fieldKey),
    }));
  };

  const handleSelectAllInCategory = (category: string, checked: boolean) => {
    const categoryFields = FIELDS_BY_CATEGORY[category] ?? [];
    const fieldKeys = categoryFields.map((f) => f.key);

    setFormData((prev) => ({
      ...prev,
      selectedFields: checked
        ? [...new Set([...prev.selectedFields, ...fieldKeys])]
        : prev.selectedFields.filter((f) => !fieldKeys.includes(f)),
    }));
  };

  const handleColumnHeaderChange = (fieldKey: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      columnHeaders: {
        ...prev.columnHeaders,
        [fieldKey]: value,
      },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Report name is required";
    }

    if (formData.format === "xlsx" && formData.selectedFields.length === 0) {
      newErrors.selectedFields =
        "At least one field must be selected for XLSX format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsGenerating(true);
    setErrors({});

    try {
      const committeeData = mapCommitteesToReportShapeWithFields(
        committeeLists.slice(0, 1),
        formData.selectedFields,
      );

      // Send committee data to backend

      const reportPayload = {
        type: "ldCommittees" as const,
        name: formData.name,
        description: formData.description,
        format: formData.format,
        payload: committeeData,
        includeFields: formData.selectedFields,
        xlsxConfig:
          formData.format === "xlsx"
            ? {
                includeCompoundFields: formData.includeCompoundFields,
                columnOrder:
                  formData.columnOrder.length > 0
                    ? formData.columnOrder
                    : undefined,
                columnHeaders:
                  Object.keys(formData.columnHeaders).length > 0
                    ? formData.columnHeaders
                    : undefined,
              }
            : undefined,
      };

      const response = await fetch("/api/generateReport", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reportPayload),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error ?? "Failed to generate report");
      }

      const responseData = (await response.json()) as { reportId: string };
      setReportId(responseData.reportId);

      toast({
        description: `Generating ${formData.format.toUpperCase()} document...`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate document",
        duration: 5000,
      });
      setIsGenerating(false);
    }
  };

  const isFieldSelected = (fieldKey: VoterRecordField) =>
    formData.selectedFields.includes(fieldKey);

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Report Information</CardTitle>
          <CardDescription>
            Basic information about the report to be generated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Report Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter report name"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter report description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select
              value={formData.format}
              onValueChange={(value: "pdf" | "xlsx") =>
                setFormData((prev) => ({ ...prev, format: value }))
              }
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
        </CardContent>
      </Card>

      {/* Field Selection - Only show for XLSX format */}
      {formData.format === "xlsx" && (
        <Card>
          <CardHeader>
            <CardTitle>Field Selection</CardTitle>
            <CardDescription>
              Choose which voter record fields to include in the XLSX document
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(FIELDS_BY_CATEGORY).map(([category, fields]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={isCategoryFullySelected(category)}
                    ref={(el) => {
                      if (el && el instanceof HTMLInputElement) {
                        el.indeterminate =
                          isCategoryPartiallySelected(category);
                      }
                    }}
                    onCheckedChange={(checked) =>
                      handleSelectAllInCategory(category, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`category-${category}`}
                    className="font-medium"
                  >
                    {category}
                  </Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ml-6">
                  {fields.map((field) => (
                    <div
                      key={field.key}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`field-${field.key}`}
                        checked={isFieldSelected(field.key)}
                        onCheckedChange={(checked) =>
                          handleFieldToggle(field.key, checked as boolean)
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
            {errors.selectedFields && (
              <p className="text-sm text-red-500">{errors.selectedFields}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* XLSX Configuration - Only show for XLSX format */}
      {formData.format === "xlsx" && (
        <Card>
          <CardHeader>
            <CardTitle>XLSX Configuration</CardTitle>
            <CardDescription>
              Additional options for XLSX document generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Compound Fields</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-name"
                    checked={formData.includeCompoundFields.name}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        includeCompoundFields: {
                          ...prev.includeCompoundFields,
                          name: checked as boolean,
                        },
                      }))
                    }
                  />
                  <Label htmlFor="include-name">
                    Include compound name field
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-address"
                    checked={formData.includeCompoundFields.address}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        includeCompoundFields: {
                          ...prev.includeCompoundFields,
                          address: checked as boolean,
                        },
                      }))
                    }
                  />
                  <Label htmlFor="include-address">
                    Include compound address field
                  </Label>
                </div>
              </div>
            </div>

            {/* Column Headers */}
            {formData.selectedFields.length > 0 && (
              <div className="space-y-2">
                <Label>Custom Column Headers (Optional)</Label>
                <div className="space-y-2">
                  {formData.selectedFields.map((fieldKey) => {
                    const field = AVAILABLE_FIELDS.find(
                      (f) => f.key === fieldKey,
                    );
                    return (
                      <div
                        key={fieldKey}
                        className="flex items-center space-x-2"
                      >
                        <Label
                          htmlFor={`header-${fieldKey}`}
                          className="w-32 text-sm"
                        >
                          {field?.label}:
                        </Label>
                        <Input
                          id={`header-${fieldKey}`}
                          value={formData.columnHeaders[fieldKey] ?? ""}
                          onChange={(e) =>
                            handleColumnHeaderChange(fieldKey, e.target.value)
                          }
                          placeholder={field?.label}
                          className="flex-1"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isGenerating}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isGenerating}>
          {isGenerating
            ? "Generating..."
            : `Generate ${formData.format.toUpperCase()}`}
        </Button>
      </div>

      {/* Status Display */}
      {isGenerating && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Generating document...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Status Tracker */}
      {reportId && (
        <ReportStatusTracker
          reportId={reportId}
          onComplete={handleReportComplete}
          onError={handleReportError}
        />
      )}
    </form>
  );
};
