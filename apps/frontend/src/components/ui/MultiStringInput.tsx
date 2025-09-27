"use client";

import { MultiValueInputBase } from "./MultiValueInputBase";

interface MultiStringInputProps {
  placeholder: string;
  value?: string | string[];
  onChange: (value: string[]) => void;
  className?: string;
}

/**
 * Simple multi-value text input component that allows users to enter
 * comma-separated values or press Enter to add values.
 */
export function MultiStringInput({
  placeholder,
  value,
  onChange,
  className,
}: MultiStringInputProps) {
  return (
    <MultiValueInputBase
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
    />
  );
}
