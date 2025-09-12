import { useState, useEffect, useCallback } from "react";
import type { VoterRecordField } from "@voter-file-tool/shared-validators";
import type { XLSXConfigFormData } from "../types";

export function useFormValidation(formData: XLSXConfigFormData) {
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [hasUserSubmitted, setHasUserSubmitted] = useState(false);

  const validateField = useCallback(
    (fieldName: string, value: string | VoterRecordField[]): string | null => {
      switch (fieldName) {
        case "name":
          return !value || (typeof value === "string" && !value.trim())
            ? "Report name is required"
            : null;
        case "includeFields":
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

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Report name is required";
    }

    if (formData.format === "xlsx" && formData.includeFields.length === 0) {
      newErrors.includeFields =
        "At least one field must be selected for XLSX format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Real-time validation effect with debouncing
  useEffect(() => {
    if (!hasUserSubmitted) return;

    const timeoutId = setTimeout(() => {
      const newErrors: Partial<Record<string, string>> = {};

      const nameError = validateField("name", formData.name);
      if (nameError) newErrors.name = nameError;

      const fieldsError = validateField(
        "includeFields",
        formData.includeFields,
      );
      if (fieldsError) newErrors.includeFields = fieldsError;

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
    formData.includeFields,
    formData.format,
    hasUserSubmitted,
    validateField,
  ]);

  const clearErrors = () => {
    setErrors({});
    setHasUserSubmitted(false);
  };

  return {
    errors,
    hasUserSubmitted,
    setHasUserSubmitted,
    validateForm,
    clearErrors,
  };
}
