// components/ElectionDistrictSelector.tsx
"use client";
import React, { useCallback, useState } from "react";

import {
  DropdownLists,
  type CommitteeList,
  type VoterRecord,
} from "@prisma/client";
import { Button } from "~/components/ui/button";
import { VoterCard } from "~/app/recordsearch/RecordsList";
import { ComboboxDropdown } from "~/components/ui/ComboBox";

interface CommitteeListSelectorProps {
  commiitteeLists: CommitteeList[];
  dropdownLists: DropdownLists;
}

const CommitteeListSelector: React.FC<CommitteeListSelectorProps> = ({
  commiitteeLists,
  dropdownLists,
}) => {
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedLegDistrict, setSelectedLegDistrict] = useState<string>("");
  const [useLegDistrict, setUseLegDistrict] = useState<boolean>(false);
  const [selectedDistrict, setSelectedDistrict] = useState<number>(-1);
  const [committeeList, setCommitteeList] = useState<VoterRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleDistrictChange = (districtString: string) => {
    const district = parseInt(districtString);
    setSelectedDistrict(district);
    fetchCommitteeList(selectedCity, district, selectedLegDistrict).catch(
      (error) => {
        console.error("Error fetching committee list:", error);
      },
    );
  };

  const handleCityChange = (city: string) => {
    if (city === selectedCity) {
      setSelectedCity("");
      setUseLegDistrict(false);
    } else {
      setSelectedCity(city);
      setSelectedDistrict(-1);
      setSelectedLegDistrict("");
    }
    if (city === "ROCHESTER") {
      setUseLegDistrict(true);
    } else {
      setUseLegDistrict(false);
    }

    setCommitteeList([]);
  };

  const handleLegChange = (legDistrict: string) => {
    if (legDistrict === selectedLegDistrict) {
      setSelectedLegDistrict("");
    } else {
      setSelectedLegDistrict(legDistrict);
    }

    setSelectedDistrict(-1);
    setCommitteeList([]);
  };

  const fetchCommitteeList = useCallback(
    async (city: string, district: number, legDistrict?: string) => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/fetchCommitteeList/?cityTown=${city}${legDistrict ? `&legDistrict=${legDistrict}` : ""}&electionDistrict=${district}`,
        );
        if (response.ok) {
          const data: unknown = await response.json();
          setCommitteeList(
            (data as { committeeMemberList: VoterRecord[] })
              .committeeMemberList || [],
          );
        } else {
          setCommitteeList([]);
        }
      } catch (error) {
        console.error("Error fetching committee list:", error);
        setCommitteeList([]);
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setCommitteeList],
  );

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
        cityTown: selectedCity,
        legDistrict: selectedLegDistrict,
        electionDistrict: selectedDistrict,
        memberId: vrcnum,
      }),
    });

    fetchCommitteeList(
      selectedCity,
      selectedDistrict,
      selectedLegDistrict,
    ).catch((error) => {
      console.error("Error fetching committee list:", error);
    });
  };

  return (
    <div>
      <label htmlFor="district-select">Select Election District:</label>
      <ComboboxDropdown
        items={dropdownLists.city.map((city) => ({
          label: city,
          value: city,
        }))}
        displayLabel={"Select City"}
        onSelect={handleCityChange}
      />
      {useLegDistrict && (
        <ComboboxDropdown
          items={dropdownLists.countyLegDistrict.map((legDistrict) => ({
            label: legDistrict,
            value: legDistrict,
          }))}
          displayLabel={"Select Leg District"}
          onSelect={handleLegChange}
        />
      )}
      {selectedCity !== "" &&
        (!useLegDistrict || selectedLegDistrict !== "") && (
          <ComboboxDropdown
            items={commiitteeLists
              .filter(
                (list) =>
                  list.cityTown === selectedCity &&
                  (!useLegDistrict ||
                    list.legDistrict === Number(selectedLegDistrict)),
              )
              .sort((a, b) => a.electionDistrict - b.electionDistrict)
              .map((list) => ({
                label: `${list.electionDistrict}`,
                value: `${list.electionDistrict}`,
              }))}
            initialValue={`${selectedDistrict}`}
            displayLabel={"Select Election District"}
            onSelect={handleDistrictChange}
          />
        )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          {committeeList.length > 0 ? (
            <ul>
              {committeeList.map((member) => (
                <li key={member.VRCNUM}>
                  <VoterCard record={member} />
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
            electionDistrict={selectedDistrict}
            city={selectedCity}
            legDistrict={selectedLegDistrict}
            committeeList={committeeList}
            onAdd={fetchCommitteeList}
          />
        </div>
      )}
    </div>
  );
};

interface AddCommitteeFormProps {
  electionDistrict: number;
  city: string;
  legDistrict: string;
  committeeList: VoterRecord[];
  onAdd: (city: string, district: number, legDistrict?: string) => void;
}

const AddCommitteeForm: React.FC<AddCommitteeFormProps> = ({
  electionDistrict,
  city,
  legDistrict,
  committeeList,
  onAdd,
}) => {
  const [voterId, setVoterId] = useState<number | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [records, setRecords] = useState<VoterRecord[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

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

    const data: unknown = await response.json();

    setRecords(data as VoterRecord[]);
    setHasSearched(true);
  };

  const handleAddCommitteeMember = async (
    event: React.FormEvent<HTMLButtonElement>,
    vrcnum: number,
  ) => {
    event.preventDefault();

    const response = await fetch(`/api/committee/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cityTown: city,
        legDistrict: legDistrict,
        electionDistrict: electionDistrict,
        memberId: vrcnum,
      }),
    });

    onAdd(city, electionDistrict, legDistrict);
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
        records.map((record: VoterRecord, id: number) => {
          return (
            <div
              className="flex flex-row items-center gap-2"
              key={`records-${id}`}
            >
              <VoterCard record={record} />
              {record.countyLegDistrict === `${electionDistrict}` ? (
                <p>eligible</p>
              ) : (
                <p>ineligible</p>
              )}
              <Button
                onClick={(e) => handleAddCommitteeMember(e, record.VRCNUM)}
                disabled={
                  committeeList.find(
                    (member) => member.VRCNUM === record.VRCNUM,
                  ) !== undefined || committeeList.length >= 4
                }
              >
                {committeeList.find(
                  (member) => member.VRCNUM === record.VRCNUM,
                ) !== undefined && "Already in Committee"}
                {committeeList.find(
                  (member) => member.VRCNUM === record.VRCNUM,
                ) === undefined &&
                  committeeList.length >= 4 &&
                  "Committee Full"}
                {committeeList.find(
                  (member) => member.VRCNUM === record.VRCNUM,
                ) === undefined &&
                  committeeList.length < 4 &&
                  "Add to Committee"}
              </Button>
            </div>
          );
        })}
      {records.length === 0 && hasSearched && <p>No results found.</p>}
    </div>
  );
};
export default CommitteeListSelector;
