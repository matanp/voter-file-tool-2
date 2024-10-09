// components/ElectionDistrictSelector.tsx
"use client";
import React, { useCallback, useContext, useState } from "react";

import {
  type DropdownLists,
  PrivilegeLevel,
  type CommitteeList,
  type VoterRecord,
} from "@prisma/client";
import { Button } from "~/components/ui/button";
import { VoterCard } from "~/app/recordsearch/RecordsList";
import { ComboboxDropdown } from "~/components/ui/ComboBox";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import { useToast } from "~/components/ui/use-toast";
import RecordSearchForm from "../components/RecordSearchForm";
import CommitteeRequestForm from "./CommitteeRequestForm";
import { VoterRecordTable } from "../recordsearch/VoterRecordTable";

interface CommitteeListSelectorProps {
  commiitteeLists: CommitteeList[];
  dropdownLists: DropdownLists;
}

const CommitteeListSelector: React.FC<CommitteeListSelectorProps> = ({
  commiitteeLists,
  dropdownLists,
}) => {
  const { actingPermissions } = useContext(GlobalContext);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedLegDistrict, setSelectedLegDistrict] = useState<string>("");
  const [useLegDistrict, setUseLegDistrict] = useState<boolean>(false);
  const [selectedDistrict, setSelectedDistrict] = useState<number>(-1);
  const [committeeList, setCommitteeList] = useState<VoterRecord[]>([]);
  const [showConfirmForm, setShowConfirmForm] = useState<boolean>(false);
  const [requestRemoveRecord, setRequestRemoveRecord] =
    useState<VoterRecord | null>(null);
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
    vrcnum: string,
  ) => {
    event.preventDefault();

    const response = await fetch(`/api/committee/remove`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cityTown: selectedCity,
        legDistrict: selectedLegDistrict === "" ? "-1" : selectedLegDistrict,
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

  const handleRequestRemove = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    record: VoterRecord,
  ): Promise<void> => {
    e.preventDefault();

    setShowConfirmForm(true);
    setRequestRemoveRecord(record);
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
          <div className="pt-2 pb-4">
            {committeeList.length > 0 ? (
              <ul>
                {committeeList.map((member) => (
                  <li key={member.VRCNUM}>
                    <VoterCard record={member} />
                    {hasPermissionFor(
                      actingPermissions,
                      PrivilegeLevel.Admin,
                    ) && (
                      <Button
                        onClick={(e) =>
                          handleRemoveCommitteeMember(e, member.VRCNUM)
                        }
                      >
                        Remove from Committee
                      </Button>
                    )}
                    {actingPermissions === PrivilegeLevel.RequestAccess && (
                      <Button onClick={(e) => handleRequestRemove(e, member)}>
                        Remove or Replace Member
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No committee members found.</p>
            )}
          </div>
          <AddCommitteeForm
            electionDistrict={selectedDistrict}
            city={selectedCity}
            legDistrict={selectedLegDistrict}
            committeeList={committeeList}
            onAdd={fetchCommitteeList}
          />
        </div>
      )}
      {showConfirmForm && requestRemoveRecord !== null && (
        <CommitteeRequestForm
          city={selectedCity}
          legDistrict={selectedLegDistrict}
          electionDistrict={selectedDistrict}
          removeMember={requestRemoveRecord}
          defaultOpen={showConfirmForm}
          onOpenChange={setShowConfirmForm}
          committeeList={committeeList}
          onSubmit={() => setShowConfirmForm(false)}
        />
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
  const { toast } = useToast();
  const { actingPermissions } = useContext(GlobalContext);
  const [records, setRecords] = useState<VoterRecord[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [requestedRecord, setRequestedRecord] = useState<VoterRecord | null>(
    null,
  );

  const validCommittee =
    ((city !== "ROCHESTER" && legDistrict === "") ||
      (city === "ROCHESTER" && legDistrict !== "")) &&
    electionDistrict !== -1 &&
    city !== "";

  const handleAddCommitteeMember = async (
    event: React.FormEvent<HTMLButtonElement>,
    record: VoterRecord,
  ) => {
    event.preventDefault();

    if (hasPermissionFor(actingPermissions, PrivilegeLevel.Admin)) {
      const response = await fetch(`/api/committee/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cityTown: city,
          legDistrict: legDistrict === "" ? "-1" : legDistrict,
          electionDistrict: electionDistrict,
          memberId: record.VRCNUM,
        }),
      });

      if (response.ok) {
        onAdd(city, electionDistrict, legDistrict);
        toast({
          title: "Success",
          description: `Added ${record.firstName} ${record.lastName} to committee`,
        });
      } else {
        toast({
          title: "Error",
          description: "Something went wrong with your request",
        });
      }
    } else {
      setShowConfirm(true);
      setRequestedRecord(record);
    }
  };

  if (actingPermissions === PrivilegeLevel.ReadAccess) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <RecordSearchForm
          handleResults={(results) => {
            setRecords(results);
            setHasSearched(true);
          }}
        />
        {records.length > 0 && (
          <VoterRecordTable
            records={records}
            paginated={false}
            extraContent={(record) => (
              <>
                <Button
                  onClick={(e) => handleAddCommitteeMember(e, record)}
                  disabled={
                    committeeList.find(
                      (member) => member.VRCNUM === record.VRCNUM,
                    ) !== undefined ||
                    committeeList.length >= 4 ||
                    !validCommittee
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
              </>
            )}
          />
        )}
        {records.length === 0 && hasSearched && <p>No results found.</p>}
      </div>
      {showConfirm && requestedRecord !== null && (
        <CommitteeRequestForm
          city={city}
          legDistrict={legDistrict}
          electionDistrict={electionDistrict}
          defaultOpen={showConfirm}
          committeeList={committeeList}
          onOpenChange={(open) => setShowConfirm(open)}
          addMember={requestedRecord}
          onSubmit={() => setShowConfirm(false)}
        />
      )}
    </>
  );
};
export default CommitteeListSelector;
