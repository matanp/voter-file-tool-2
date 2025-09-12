"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
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
import { ReportStatusTracker } from "~/app/components/ReportStatusTracker";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
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
  { key: "firstName", label: "First Name", category: "Identification" },
  { key: "middleInitial", label: "Middle Initial", category: "Identification" },
  { key: "lastName", label: "Last Name", category: "Identification" },
  { key: "suffixName", label: "Suffix Name", category: "Identification" },
  { key: "DOB", label: "Date of Birth", category: "Identification" },
  { key: "gender", label: "Gender", category: "Identification" },

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
  const [formData, setFormData] =
    useState<XLSXConfigFormData>(DEFAULT_FORM_DATA);
  const [reportId, setReportId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [hasUserSubmitted, setHasUserSubmitted] = useState(false);

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

  const clearForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setErrors({});
    setHasUserSubmitted(false);
    setReportId(null);
    setIsGenerating(false);
  };

  const handleFieldToggle = (fieldKey: VoterRecordField, checked: boolean) => {
    setFormData((prev) => {
      const newSelectedFields = checked
        ? [...prev.selectedFields, fieldKey]
        : prev.selectedFields.filter((f) => f !== fieldKey);

      return {
        ...prev,
        selectedFields: newSelectedFields,
      };
    });
  };

  const handleSelectAllInCategory = (category: string, checked: boolean) => {
    const categoryFields = FIELDS_BY_CATEGORY[category] ?? [];
    const fieldKeys = categoryFields.map((f) => f.key);

    setFormData((prev) => {
      const newSelectedFields = checked
        ? [...new Set([...prev.selectedFields, ...fieldKeys])]
        : prev.selectedFields.filter((f) => !fieldKeys.includes(f));

      return {
        ...prev,
        selectedFields: newSelectedFields,
      };
    });
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

  // Dynamic validation - clear errors as user fixes them
  const validateField = React.useCallback(
    (fieldName: string, value: string | VoterRecordField[]): string | null => {
      switch (fieldName) {
        case "name":
          return !value || (typeof value === "string" && !value.trim())
            ? "Report name is required"
            : null;
        case "selectedFields":
          return formData.format === "xlsx" &&
            (!value || (Array.isArray(value) && value.length === 0))
            ? "At least one field must be selected for XLSX format"
            : null;
        default:
          return null;
      }
    },
    [formData.format],
  );

  // Real-time validation effect with debouncing
  useEffect(() => {
    if (!hasUserSubmitted) return;

    const timeoutId = setTimeout(() => {
      const newErrors: Partial<Record<string, string>> = {};

      const nameError = validateField("name", formData.name);
      if (nameError) newErrors.name = nameError;

      const fieldsError = validateField(
        "selectedFields",
        formData.selectedFields,
      );
      if (fieldsError) newErrors.selectedFields = fieldsError;

      // Update errors if they've actually changed
      setErrors((prevErrors) => {
        const hasChanges =
          Object.keys(newErrors).some(
            (key) => newErrors[key] !== prevErrors[key],
          ) ||
          Object.keys(prevErrors).some(
            (key) => !newErrors[key] && prevErrors[key],
          );

        return hasChanges ? newErrors : prevErrors;
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [
    formData.name,
    formData.selectedFields,
    formData.format,
    hasUserSubmitted,
    validateField,
  ]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Mark that user has attempted to submit the form
    setHasUserSubmitted(true);

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
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-none">
      <Accordion
        type="multiple"
        defaultValue={["report-info", "field-selection"]}
        className="w-full space-y-4"
      >
        {/* Basic Information */}
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
                  setFormData((prev) => ({ ...prev, name: e.target.value }));
                }}
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
                onValueChange={(value: "pdf" | "xlsx") => {
                  setFormData((prev) => ({ ...prev, format: value }));
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

        {/* Field Selection - Only show for XLSX format */}
        {formData.format === "xlsx" && (
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
                    <Button
                      type="button"
                      variant={
                        isCategoryFullySelected(category)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        handleSelectAllInCategory(
                          category,
                          !isCategoryFullySelected(category),
                        )
                      }
                      className={`text-xs font-medium transition-colors ${
                        isCategoryPartiallySelected(category)
                          ? "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
                          : ""
                      }`}
                    >
                      {isCategoryFullySelected(category)
                        ? "Deselect All"
                        : isCategoryPartiallySelected(category)
                          ? "Select All"
                          : "Select All"}
                    </Button>
                  </div>

                  {/* Add compound field options for specific categories */}
                  {category === "Identification" && (
                    <div className="ml-6 mb-2">
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
                        <Label
                          htmlFor="include-name"
                          className="text-sm font-medium"
                        >
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
                            setFormData((prev) => ({
                              ...prev,
                              includeCompoundFields: {
                                ...prev.includeCompoundFields,
                                address: checked as boolean,
                              },
                            }))
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 ml-6 max-w-4xl">
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
                        <Label
                          htmlFor={`field-${field.key}`}
                          className="text-sm"
                        >
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
            </AccordionContent>
          </AccordionItem>
        )}

        {/* XLSX Configuration - Only show for XLSX format */}
        {formData.format === "xlsx" && (
          <AccordionItem
            value="xlsx-config"
            className="bg-white rounded-lg shadow-sm"
          >
            <AccordionTrigger className="primary-header text-left bg-white px-6 py-4">
              XLSX Configuration
            </AccordionTrigger>
            <AccordionContent className="space-y-4 bg-white p-6 pt-0 rounded-lg">
              <p className="text-sm text-muted-foreground mb-4">
                Additional options for XLSX document generation
              </p>
              {/* Column Headers */}
              {formData.selectedFields.length > 0 && (
                <div className="space-y-2">
                  <Label>Custom Column Headers (Optional)</Label>
                  <div className="space-y-2 max-w-2xl">
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
                            className="w-32 text-sm flex-shrink-0"
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
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Submit Button */}
      <div className="space-y-2">
        {/* Form Errors Display */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Please fix the following errors:
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc list-inside space-y-1">
                    {Object.entries(errors).map(([key, error]) => (
                      <li key={key} className="animate-in fade-in duration-200">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success message when all errors are cleared */}
        {hasUserSubmitted && Object.keys(errors).length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  All validation errors have been resolved. You can now generate
                  the report.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={clearForm}
            disabled={isGenerating}
          >
            Clear
          </Button>
          <Button
            type="submit"
            disabled={isGenerating || Object.keys(errors).length > 0}
          >
            {isGenerating
              ? "Generating..."
              : `Generate ${formData.format.toUpperCase()}`}
          </Button>
        </div>
      </div>

      {/* Status Display */}
      {isGenerating && (
        <div className="bg-primary-foreground p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Generating document...</span>
          </div>
        </div>
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
