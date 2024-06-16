"use client";
import { useState } from "react";
import { Button } from "~/components/ui/button";

interface PartyFormProps {
  handleSubmit: (party: string, electionDistrict: string) => Promise<void>;
}

const PartyForm: React.FC<PartyFormProps> = (props) => {
  const [party, setParty] = useState<string>("");
  const [electionDistrict, setElectionDistrict] = useState<string>("");

  const handlePartyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    console.log(event.target.value);
    setParty(event.target.value);
  };

  const handleDistrictChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setElectionDistrict(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    props.handleSubmit(party, electionDistrict);
  };

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={handleSubmit}>
        <div className="text-foreground mb-4">
          <label htmlFor="party" className="block text-sm font-medium">
            Party
          </label>

          <select
            id="party"
            name="party"
            className="focus:accent focus:ring-ring border-border mt-1 block w-full rounded-md border p-2 focus:outline-none sm:text-sm"
            value={party}
            onChange={handlePartyChange}
          >
            <option value="">Select Party</option>
            <option value="BLK">BLK</option>
            <option value="DEM">DEM</option>
            <option value="REP">REP</option>
          </select>
        </div>
        <div className="mb-4">
          <label
            htmlFor="district"
            className="text-foreground block text-sm font-medium"
          >
            Election District
          </label>
          <input
            type="text"
            id="district"
            name="district"
            className="focus:border-accent focus:ring-ring border-border mt-1 block w-full rounded-md border p-2 focus:outline-none sm:text-sm"
            value={electionDistrict}
            onChange={handleDistrictChange}
          />
        </div>
        <div>
          <Button
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary-700 focus:ring-primary w-full rounded-md border border-transparent px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            Submit
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PartyForm;
