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
    name: "empty",
    displayName: "Select a field",
    value: "",
    compoundType: false,
    type: "String",
  },
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
  {
    name: "address",
    displayName: "Address",
    compoundType: true,
    fields: [
      {
        name: "houseNum",
        displayName: "House Number",
        compoundType: false,
        type: "number",
      },
      {
        name: "street",
        displayName: "Street",
        compoundType: false,
        type: "String",
      },
    ],
  },
  {
    name: "city",
    displayName: "City / Town",
    compoundType: false,
    type: "String",
  },
  // { name: "state", displayName: "State", compoundType: false, type: "String" },
  {
    name: "zipCode",
    displayName: "Zip Code",
    compoundType: false,
    type: "String",
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
      // {
      //   name: "congressionalDistrict",
      //   displayName: "Congressional District",
      //   compoundType: false,
      //   type: "String",
      // },
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
        name: "electionDistrict",
        displayName: "Election District",
        compoundType: false,
        type: "number",
      },
      // {
      //   name: "statevid",
      //   displayName: "Statevid",
      //   compoundType: false,
      //   type: "String",
      // },
    ],
  },
];

const VoterRecordSearch: React.FC<VoterRecordSearchProps> = (props) => {
  const [searchRows, setSearchRows] = useState<SearchField[]>([
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
    {
      name: "address",
      displayName: "Address",
      compoundType: true,
      fields: [
        {
          name: "houseNum",
          displayName: "House Number",
          compoundType: false,
          type: "number",
        },
        {
          name: "street",
          displayName: "Street",
          compoundType: false,
          type: "String",
        },
      ],
    },
  ]);

  const handleChangeField = (index: number, field: string) => {
    const updatedRows = [...searchRows];
    let updatedRow: SearchField | undefined = updatedRows[index];
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
    } else if (updatedRow?.compoundType && compoundIndex !== undefined) {
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
    const filteredRows = searchRows
      .map((row) => {
        if (row.compoundType) {
          return {
            ...row,
            fields: row.fields.filter((field) => field.value),
          };
        }
        return row;
      })
      .filter((row) => row.compoundType || row.value);
    props.handleSubmit(filteredRows).catch((error) => {
      console.error("Error submitting search:", error);
    });
  };

  return (
    <div className="mx-auto max-w-lg">
      <form onSubmit={handleSubmit} className="w-max">
        {searchRows.map((row, index) => (
          <div key={`outer-key-${index}`} className="pb-4">
            <div className="flex gap-2">
              <div className="flex flex-row items-center">
                <select
                  className="form-select h-10 border-2 border-secondary"
                  value={row.name}
                  onChange={(e) => handleChangeField(index, e.target.value)}
                >
                  <optgroup>
                    {SEARCH_FIELDS.filter(
                      (field) =>
                        searchRows.find((row) => row.name === field.name) ===
                          undefined || row.name === field.name,
                    ).map((field, idx) => (
                      <option value={field.name} key={`fiield-${idx}`}>
                        {field.displayName}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="col-sm-4">
                {!row.compoundType && row.name !== "empty" && (
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
                        placeholder={`Enter ${row.displayName}`}
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
                      <div
                        key={`sub-index-${index}-${subIdx}`}
                        className="flex gap-2 pb-2"
                      >
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
                            placeholder={`Enter ${field.displayName}`}
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
                name: "empty",
                displayName: "Select a field",
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
