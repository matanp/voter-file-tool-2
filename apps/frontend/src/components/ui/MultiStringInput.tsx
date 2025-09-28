"use client";

import { MultiValueInputBase } from "./MultiValueInputBase";
import type { ComponentProps } from "react";

export type MultiStringInputProps = ComponentProps<typeof MultiValueInputBase>;

/**
 * Simple multi-value text input component that allows users to enter
 * comma-separated values or press Enter to add values.
 */
export function MultiStringInput(props: MultiStringInputProps) {
  return <MultiValueInputBase {...props} />;
}
