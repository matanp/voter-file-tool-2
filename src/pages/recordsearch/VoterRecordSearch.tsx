"use client";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/datePicker";

interface VoterRecordSearchProps {
  handleSubmit: (searchQuery: SearchField[]) => Promise<void>;
}

export interface BaseSearchField {
  name: string;
  displayName: string;
  compoundType: false;
  type: string;
  value?: string | Date | number;
}

export type SearchField =
  | BaseSearchField
  | {
      name: string;
      displayName: string;
      compoundType: true;
      fields: BaseSearchField[];
    };

const SEARCH_FIELDS: SearchField[] = [
  {
    name: "VRCNUM",
    displayName: "Voter Registration Number",
    compoundType: false,
    type: "number",
  },
  {
    name: "name",
    displayName: "Name",
    compoundType: true,
    fields: [
      {
        name: "firstName",
        displayName: "First Name",
        compoundType: false,
        type: "String",
      },
      {
        name: "lastName",
        displayName: "Last Name",
        compoundType: false,
        type: "String",
      },
    ],
  },
  { name: "city", displayName: "City", compoundType: false, type: "String" },
  { name: "state", displayName: "State", compoundType: false, type: "String" },
  {
    name: "zip",
    displayName: "Zip Code",
    compoundType: true,
    fields: [
      {
        name: "zipCode",
        displayName: "Zip Code",
        compoundType: false,
        type: "String",
      },
      {
        name: "zipSuffix",
        displayName: "Zip Suffix",
        compoundType: false,
        type: "String",
      },
    ],
  },
  {
    name: "DOB",
    displayName: "Date of Birth",
    compoundType: false,
    type: "DateTime",
  },
  {
    name: "district",
    displayName: "District",
    compoundType: true,
    fields: [
      {
        name: "electionDistrict",
        displayName: "Election District",
        compoundType: false,
        type: "number",
      },
      {
        name: "countyLegDistrict",
        displayName: "County Leg District",
        compoundType: false,
        type: "String",
      },
      {
        name: "stateAssmblyDistrict",
        displayName: "State Assembly District",
        compoundType: false,
        type: "String",
      },
      {
        name: "stateSenateDistrict",
        displayName: "State Senate District",
        compoundType: false,
        type: "String",
      },
      {
        name: "congressionalDistrict",
        displayName: "Congressional District",
        compoundType: false,
        type: "String",
      },
      {
        name: "CC_WD_Village",
        displayName: "CC WD Village",
        compoundType: false,
        type: "String",
      },
      {
        name: "townCode",
        displayName: "Town Code",
        compoundType: false,
        type: "String",
      },
      {
        name: "statevid",
        displayName: "Statevid",
        compoundType: false,
        type: "String",
      },
    ],
  },
];

const VoterRecordSearch: React.FC<VoterRecordSearchProps> = (props) => {
  const [searchRows, setSearchRows] = useState<SearchField[]>([
    {
      name: "",
      displayName: "Pick a field",
      value: "",
      compoundType: false,
      type: "String",
    },
  ]);

  const handleChangeField = (index: number, field: string) => {
    const updatedRows = [...searchRows];
    let updatedRow = updatedRows[index];
    if (updatedRow) {
      updatedRow = SEARCH_FIELDS.find(
        (searchField) => searchField.name === field,
      );
      if (updatedRow) {
        updatedRows[index] = updatedRow;
      }
    }

    setSearchRows(updatedRows);
  };

  const handleRemoveRow = (index: number) => {
    const updatedRows = [...searchRows];
    updatedRows.splice(index, 1);
    setSearchRows(updatedRows);
  };

  const handleChangeValue = (
    index: number,
    value: string | Date,
    compoundIndex?: number,
  ) => {
    const updatedRows = [...searchRows];
    const updatedRow = updatedRows[index];
    if (updatedRow && !updatedRow.compoundType) {
      updatedRow.value = updatedRow.type === "number" ? Number(value) : value;
      updatedRows[index] = updatedRow;
    } else if (
      updatedRow &&
      updatedRow.compoundType &&
      compoundIndex !== undefined
    ) {
      const updatedField = updatedRow.fields[compoundIndex];

      if (updatedField) {
        updatedField.value =
          updatedField.type === "number" ? Number(value) : value;
        updatedRow.fields[compoundIndex] = updatedField;
        updatedRows[index] = updatedRow;
      }
    }
    setSearchRows(updatedRows);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log(searchRows);
    props.handleSubmit(searchRows);
  };

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={handleSubmit} className="w-max">
        {searchRows.map((row, index) => (
          <div key={`outer-key-${index}`} className="pb-4">
            <div className="flex gap-2">
              <div className="border-2 border-secondary">
                <select
                  className="form-select h-10"
                  value={row.name}
                  onChange={(e) => handleChangeField(index, e.target.value)}
                >
                  <optgroup>
                    <option value="">Select a field</option>
                    {SEARCH_FIELDS.map((field, idx) => (
                      <option value={field.name} key={`fiield-${idx}`}>
                        {field.displayName}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="col-sm-4">
                {!row.compoundType && (
                  <>
                    {row.type === "DateTime" && (
                      <DatePicker
                        onChange={(date) => {
                          handleChangeValue(index, date);
                        }}
                      />
                    )}
                    {row.type !== "DateTime" && (
                      <input
                        type={row.type}
                        className="form-control h-10 p-2 ring-ring focus:ring-1 focus:ring-inset"
                        placeholder={`Enter ${row.name}`}
                        onChange={(e) =>
                          handleChangeValue(index, e.target.value)
                        }
                      />
                    )}
                  </>
                )}
                {row.compoundType &&
                  row.fields.map((field, subIdx) => {
                    return (
                      <div key={`sub-index-${index}-${subIdx}`}>
                        <label>{field.displayName}</label>
                        {field.type === "DateTime" && (
                          <DatePicker
                            onChange={(date) =>
                              handleChangeValue(index, date, subIdx)
                            }
                          />
                        )}
                        {field.type !== "DateTime" && (
                          <input
                            type={field.type}
                            className="form-control"
                            placeholder={`Enter ${row.name}`}
                            onChange={(e) =>
                              handleChangeValue(index, e.target.value, subIdx)
                            }
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
              <div className="col-sm-2 flex flex-row items-center">
                <Button
                  className="btn btn-danger"
                  onClick={() => handleRemoveRow(index)}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          onClick={() =>
            setSearchRows([
              ...searchRows,
              {
                name: "",
                displayName: "Pick a field",
                value: "",
                compoundType: false,
                type: "String",
              },
            ])
          }
        >
          Add Row
        </Button>

        <div className="py-2">
          <Button
            type="submit"
            className="hover:bg-primary-700 w-full rounded-md border border-transparent bg-primary px-4 py-2 text-primary-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Submit
          </Button>
        </div>
      </form>
    </div>
  );
};

export default VoterRecordSearch;
