import { VoterRecord } from "@prisma/client";
import { useState } from "react";
import { Button } from "~/components/ui/button";

type RecordSearchProps = {
  handleResults: (results: VoterRecord[]) => void;
};

const RecordSearchForm: React.FC<RecordSearchProps> = ({ handleResults }) => {
  const [voterId, setVoterId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = [];

    if (voterId) {
      query.push({ field: "VRCNUM", value: voterId });
    }

    if (firstName) {
      query.push({ field: "firstName", value: firstName });
    }

    if (lastName) {
      query.push({ field: "lastName", value: lastName });
    }

    const response = await fetch(`/api/fetchFilteredData`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ searchQuery: query, page: 1, pageSize: 100 }),
    });

    // :TODO: does this need to be validated?
    const { data } = (await response.json()) as {
      data: VoterRecord[];
      totalRecords: number;
    };

    handleResults(data);
  };
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        className="form-control h-10 p-2 ring-ring focus:ring-1 focus:ring-inset"
        placeholder={`Enter Voter ID`}
        onChange={(e) => setVoterId(e.target.value)}
      />
      <input
        type="string"
        className="form-control h-10 p-2 ring-ring focus:ring-1 focus:ring-inset"
        placeholder={`Enter First Name`}
        onChange={(e) => setFirstName(e.target.value)}
      />
      <input
        type="string"
        className="form-control h-10 p-2 ring-ring focus:ring-1 focus:ring-inset"
        placeholder={`Enter Last Name`}
        onChange={(e) => setLastName(e.target.value)}
      />
      <Button type="submit">Find Members to Add</Button>
    </form>
  );
};

export default RecordSearchForm;
