"use client";

import React from "react";
import { XlsxUploadCard } from "~/components/admin/XlsxUploadCard";

type WeightedTableImportResponse = {
  matched?: number;
  skippedNoCommittee?: number;
};

export const WeightedTableImport = () => {
  return (
    <XlsxUploadCard<WeightedTableImportResponse>
      endpoint="/api/admin/weightedTable/import"
      formFieldName="weightedTable"
      title="Weighted Table Import"
      label="Weighted Table (Excel)"
      inputId="weighted-table-file"
      noFileDescription="Please select a Weighted Table Excel file"
      description="Import LTED weights from the MCDC Weighted Table Excel file. Matches committees by leg district and election district."
      renderResult={(data) => (
        <>
          Matched: {data.matched ?? 0} committees updated. Skipped (no committee):{" "}
          {data.skippedNoCommittee ?? 0}.
        </>
      )}
    />
  );
};
