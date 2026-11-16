import React from "react";
import { render } from "@testing-library/react";
import { VILLAGE_WARD_LABEL } from "@voter-file-tool/shared-validators";

import { fields } from "~/app/recordsearch/fieldsConfig";
import { createMockVoterRecord } from "../utils/testUtils";

const column = fields.find((field) => field.name === "CC_WD_Village")!;

const renderCell = (CC_WD_Village: string | null) =>
  render(
    <table>
      <tbody>
        <tr>{column.cell(createMockVoterRecord({ CC_WD_Village }))}</tr>
      </tbody>
    </table>,
  ).container.querySelector("td");

describe("record search Village / Ward column", () => {
  it("uses the shared label", () => {
    expect(column.head).toBe(VILLAGE_WARD_LABEL);
  });

  it("shows the village or ward code", () => {
    expect(renderCell("WE")).toHaveTextContent("WE");
  });

  it("is blank when the voter isn't in a village or ward", () => {
    expect(renderCell("00")).toHaveTextContent(/^$/);
  });
});
