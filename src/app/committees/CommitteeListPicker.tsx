// components/ElectionDistrictSelector.tsx
"use client";
import React, { useState } from "react";

import { ElectionDistrict, VoterRecord } from "@prisma/client";
import { Button } from "~/components/ui/button";
import { VoterCard } from "~/pages/recordsearch/RecordsList";

interface CommitteeMember {
  VRCNUM: number;
  lastName: string | null;
  firstName: string | null;
  middleInitial: string | null;
  // Add other fields as needed
}

interface ElectionDistrictSelectorProps {
  electionDistricts: ElectionDistrict[];
}

const ElectionDistrictSelector: React.FC<ElectionDistrictSelectorProps> = ({
  electionDistricts,
}) => {
  const [selectedDistrict, setSelectedDistrict] = useState<number>(1);
  const [committeeList, setCommitteeList] = useState<CommitteeMember[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleDistrictChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const district = parseInt(event.target.value);
    setSelectedDistrict(district);
    fetchCommitteeList(district);
  };

  const fetchCommitteeList = async (district: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/fetchCommitteeList/?electionDistrict=${district}`,
      );
      if (response.ok) {
        const data = await response.json();
        setCommitteeList(data.committeeMemberList || []);
      } else {
        setCommitteeList([]);
      }
    } catch (error) {
      console.error("Error fetching committee list:", error);
      setCommitteeList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCommitteeMember = async (
    event: React.FormEvent<HTMLButtonElement>,
    vrcnum: number,
  ) => {
    event.preventDefault();

    const response = await fetch(`/api/committee/remove`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        electionDistrict: selectedDistrict,
        memberId: vrcnum,
      }),
    });

    fetchCommitteeList(selectedDistrict);
  };

  return (
    <div>
      <label htmlFor="district-select">Select Election District:</label>
      <select id="district-select" onChange={handleDistrictChange}>
        {electionDistricts
          .sort((a, b) => a.electionDistrict - b.electionDistrict)
          .map((district) => (
            <option
              key={district.electionDistrict}
              value={district.electionDistrict}
            >
              {district.electionDistrict}
            </option>
          ))}
      </select>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          {committeeList.length > 0 ? (
            <ul>
              {committeeList.map((member) => (
                <li key={member.VRCNUM}>
                  <VoterCard record={member as VoterRecord} />
                  <Button
                    onClick={(e) =>
                      handleRemoveCommitteeMember(e, member.VRCNUM)
                    }
                  >
                    Remove from Committee
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No committee members found.</p>
          )}
          <AddCommitteeForm
            committeeNumber={selectedDistrict}
            onAdd={fetchCommitteeList}
          />
        </div>
      )}
    </div>
  );
};

interface AddCommitteeFormProps {
  committeeNumber: number;
  onAdd: (district: number) => void;
}

const AddCommitteeForm: React.FC<AddCommitteeFormProps> = ({
  committeeNumber,
  onAdd,
}) => {
  const [voterId, setVoterId] = useState<number | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);

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
      body: JSON.stringify(query),
    });

    const data = await response.json();

    setRecords(data);
  };

  const handleAddCommitteeMember = async (
    event: React.FormEvent<HTMLButtonElement>,
    vrcnum: number,
  ) => {
    console.log("uhhhhhh");
    event.preventDefault();

    const response = await fetch(`/api/committee/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        electionDistrict: committeeNumber,
        memberId: vrcnum,
      }),
    });

    console.log(response);

    onAdd(committeeNumber);
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSubmit}>
        <input
          type="number"
          className="form-control h-10 p-2 ring-ring focus:ring-1 focus:ring-inset"
          placeholder={`Enter Voter ID`}
          onChange={(e) => setVoterId(Number(e.target.value))}
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
      {records.length > 0 &&
        records.map((record: VoterRecord, id: any) => {
          return (
            <div className="flex flex-row items-center gap-2" key={id}>
              <VoterCard record={record} />
              {record.countyLegDistrict === `${committeeNumber}` ? (
                <p>eligible</p>
              ) : (
                <p>ineligible</p>
              )}
              <Button
                onClick={(e) => handleAddCommitteeMember(e, record.VRCNUM)}
              >
                Add to Committee
              </Button>
            </div>
          );
        })}
    </div>
  );
};
export default ElectionDistrictSelector;
