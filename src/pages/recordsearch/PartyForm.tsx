"use client";
import { useState } from "react";
import { Button } from "~/components/ui/button";

interface PartyFormProps {
  handleSubmit: (party: string, electionDistrict: string) => Promise<void>;
}

// const SEARCH_FIELDS = [
//   { VRCNUM: "Int" },
//   { lastName: "String" },
//   { firstName: "String" },
//   { middleInitial: "String" },
//   { suffixName: "String" },
//   { houseNum: "Int" },
//   { street: "String" },
//   { apartment: "String" },
//   { halfAddress: "String" },
//   { resAddrLine2: "String" },
//   { resAddrLine3: "String" },
//   { city: "String" },
//   { state: "String" },
//   { zipCode: "String" },
//   { zipSuffix: "String" },
//   { telephone: "String" },
//   { email: "String" },
//   { mailingAddress1: "String" },
//   { mailingAddress2: "String" },
//   { mailingAddress3: "String" },
//   { mailingAddress4: "String" },
//   { mailingCity: "String" },
//   { mailingState: "String" },
//   { mailingZip: "String" },
//   { mailingZipSuffix: "String" },
//   { party: "String" },
//   { gender: "String" },
//   { DOB: "DateTime" },
//   { L_T: "String" },
//   { electionDistrict: "Int" },
//   { countyLegDistrict: "String" },
//   { stateAssmblyDistrict: "String" },
//   { stateSenateDistrict: "String" },
//   { congressionalDistrict: "String" },
//   { CC_WD_Village: "String" },
//   { townCode: "String" },
//   { lastUpdate: "DateTime" },
//   { originalRegDate: "DateTime" },
//   { statevid: "String" },
// ];

type FieldType = "Int" | "String" | "DateTime";

interface SearchField {
  [key: string]: FieldType;
}

const SEARCH_FIELDS: SearchField[] = [
  { VRCNUM: "Int" },
  { lastName: "String" },
  { firstName: "String" },
  { city: "String" },
  { state: "String" },
  { zipCode: "String" },
  { zipSuffix: "String" },
  { email: "String" },
  { party: "String" },
  { gender: "String" },
  { DOB: "DateTime" },
  { L_T: "String" },
  { electionDistrict: "Int" },
  { countyLegDistrict: "String" },
  { stateAssmblyDistrict: "String" },
  { stateSenateDistrict: "String" },
  { congressionalDistrict: "String" },
  { CC_WD_Village: "String" },
  { townCode: "String" },
  { statevid: "String" },
];

const PartyForm: React.FC<PartyFormProps> = (props) => {
  const [searchRows, setSearchRows] = useState<
    {
      field: string;
      value: string;
    }[]
  >([{ field: "", value: "" }]);

  const handleChangeField = (index: number, field: string) => {
    const updatedRows = [...searchRows];
    const updatedRow = updatedRows[index];
    if (updatedRow) {
      updatedRow.field = field;
      updatedRows[index] = updatedRow;
    }

    setSearchRows(updatedRows);
  };

  const handleRemoveRow = (index: number) => {
    const updatedRows = [...searchRows];
    updatedRows.splice(index, 1);
    setSearchRows(updatedRows);
  };

  const handleChangeValue = (index: number, value: string) => {
    const updatedRows = [...searchRows];
    const updatedRow = updatedRows[index];
    if (updatedRow) {
      updatedRow.value = value;
      updatedRows[index] = updatedRow;
    }
    setSearchRows(updatedRows);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // props.handleSubmit(party, electionDistrict);
  };

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={handleSubmit}>
        {searchRows.map((row, index) => (
          <>
            <div className="flex">
              <div>
                <select
                  className="form-select"
                  value={row.field}
                  onChange={(e) => handleChangeField(index, e.target.value)}
                >
                  <optgroup>
                    <option value="">Select a field</option>
                    {SEARCH_FIELDS.map((field, idx) => (
                      <option value={Object.keys(field)[0]}>
                        {Object.keys(field)[0]}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="col-sm-4">
                {row.field && (
                  <input
                    type={
                      SEARCH_FIELDS.find(
                        (f) => Object.keys(f)[0] === row.field,
                      )?.[row.field as keyof SearchField]
                    }
                    className="form-control"
                    placeholder={`Enter ${row.field}`}
                    value={row.value}
                    onChange={(e) => handleChangeValue(index, e.target.value)}
                  />
                )}
              </div>
              <div className="col-sm-2">
                <Button
                  className="btn btn-danger"
                  onClick={() => handleRemoveRow(index)}
                >
                  Remove
                </Button>
              </div>
            </div>
          </>
        ))}

        <div>
          <Button
            type="submit"
            className="hover:bg-primary-700 w-full rounded-md border border-transparent bg-primary px-4 py-2 text-primary-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Submit
          </Button>
        </div>
      </form>
      <Button
        type="button"
        onClick={() => setSearchRows([...searchRows, { field: "", value: "" }])}
      >
        Add Row
      </Button>
    </div>
  );
};

export default PartyForm;
