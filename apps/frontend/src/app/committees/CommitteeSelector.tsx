"use client";
import React, { useCallback, useContext, useState } from "react";

import {
  PrivilegeLevel,
  type CommitteeList,
  type VoterRecord,
} from "@prisma/client";
import { Button } from "~/components/ui/button";
import { VoterCard } from "~/app/recordsearch/RecordsList";
import { ComboboxDropdown } from "~/components/ui/ComboBox";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import CommitteeRequestForm from "./CommitteeRequestForm";
import { AddCommitteeForm } from "./AddCommitteeForm";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { useApiMutation } from "~/hooks/useApiMutation";
import { useToast } from "~/components/ui/use-toast";

interface CommitteeSelectorProps {
  committeeLists: CommitteeList[];
}

const CommitteeSelector: React.FC<CommitteeSelectorProps> = ({
  committeeLists,
}) => {
  const { actingPermissions } = useContext(GlobalContext);
  const { toast } = useToast();
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedLegDistrict, setSelectedLegDistrict] = useState<string>("");
  const [useLegDistrict, setUseLegDistrict] = useState<boolean>(false);
  const [selectedDistrict, setSelectedDistrict] = useState<number>(-1);
  const [committeeList, setCommitteeList] = useState<VoterRecord[]>([]);
  const [showConfirmForm, setShowConfirmForm] = useState<boolean>(false);
  const [requestRemoveRecord, setRequestRemoveRecord] =
    useState<VoterRecord | null>(null);
  const [legDistricts, setLegDistricts] = useState<string[]>([]);

  const [loading, setLoading] = useState<boolean>(false);

  const removeCommitteeMemberMutation = useApiMutation<
    { success: boolean },
    {
      cityTown: string;
      legDistrict: string;
      electionDistrict: number;
      memberId: string;
    }
  >("/api/committee/remove", "POST", {
    onSuccess: (data, payload) => {
      if (payload) {
        // Normalize electionDistrict sentinel values (-1) to undefined
        const normalizedElectionDistrict =
          payload.electionDistrict === -1
            ? undefined
            : payload.electionDistrict;

        // Normalize legDistrict sentinel values ("-1") to undefined
        const normalizedLegDistrict =
          payload.legDistrict === "-1" ? undefined : payload.legDistrict;

        // Only refetch if we have valid parameters
        if (payload.cityTown && normalizedElectionDistrict !== undefined) {
          fetchCommitteeList(
            payload.cityTown,
            normalizedElectionDistrict,
            normalizedLegDistrict,
          ).catch((error) => {
            console.error("Error fetching committee list:", error);
          });
        }
      }

      toast({
        title: "Success",
        description: "Committee member removed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to remove committee member: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const cities = new Set(committeeLists.map((list) => list.cityTown));

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
    if (city.toUpperCase() === "ROCHESTER") {
      setUseLegDistrict(true);
    } else {
      setUseLegDistrict(false);
    }

    const legDistricts = Array.from(
      new Set(
        committeeLists
          .filter((list) => list.cityTown === city)
          .map((list) => String(list.legDistrict)),
      ),
    ).sort((a, b) => Number(a) - Number(b));

    setLegDistricts(legDistricts);

    if (legDistricts[0] && legDistricts.length === 1) {
      setSelectedLegDistrict(legDistricts[0]);
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
          `/api/fetchCommitteeList/?cityTown=${encodeURIComponent(
            city,
          )}${legDistrict ? `&legDistrict=${encodeURIComponent(legDistrict)}` : ""}&electionDistrict=${encodeURIComponent(
            String(district),
          )}`,
        );
        if (response.ok) {
          const data: unknown = await response.json();
          setCommitteeList(
            (data as { committeeMemberList: VoterRecord[] })
              .committeeMemberList || [],
          );
        } else if (response.status === 403) {
          // User doesn't have permission to view member data
          setCommitteeList([]);
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
    event: React.MouseEvent<HTMLButtonElement>,
    vrcnum: string,
  ) => {
    void removeCommitteeMemberMutation.mutate({
      cityTown: selectedCity,
      legDistrict: selectedLegDistrict === "" ? "-1" : selectedLegDistrict,
      electionDistrict: selectedDistrict,
      memberId: vrcnum,
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

  const noContentMessage = () => {
    if (!selectedCity || !selectedLegDistrict || selectedDistrict < 0) {
      return "Select a committee to view members.";
    }

    if (!hasPermissionFor(actingPermissions, PrivilegeLevel.Admin)) {
      return "You don't have permission to view committee member details. Contact an administrator for access.";
    }

    return "No committee members found.";
  };

  const getCommitteeListHeader = () => {
    if (!selectedCity || !selectedLegDistrict || selectedDistrict < 0) {
      return "Committee List";
    }

    if (!useLegDistrict) {
      return `Committee List: ${selectedCity} - Election District ${selectedDistrict}`;
    }

    return `Committee List: ${selectedCity} - LD - ${selectedLegDistrict}, ED - ${selectedDistrict}`;
  };

  return (
    <div>
      <label htmlFor="district-select" className="primary-header">
        Committee Selector
      </label>
      <Card className="bg-primary-foreground p-2 w-max flex gap-4">
        <div className="flex flex-col">
          <label className="font-extralight text-sm pl-1">City</label>
          <ComboboxDropdown
            items={Array.from(cities).map((city) => ({
              label: city,
              value: city,
            }))}
            displayLabel={"Select City"}
            onSelect={handleCityChange}
          />
        </div>
        {useLegDistrict && (
          <div className="flex flex-col">
            <label className="font-extralight text-sm pl-1">
              Legislative District
            </label>
            <ComboboxDropdown
              items={Array.from(
                new Set(
                  legDistricts.map((legDistrict) => ({
                    label: legDistrict,
                    value: legDistrict,
                  })),
                ),
              )}
              displayLabel={"Select Leg District"}
              onSelect={handleLegChange}
            />
          </div>
        )}
        {selectedCity !== "" &&
          (!useLegDistrict || selectedLegDistrict !== "") && (
            <div className="flex flex-col">
              <label className="font-extralight text-sm pl-1">
                Election District
              </label>
              <ComboboxDropdown
                items={Array.from(
                  new Set(
                    committeeLists
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
                      })),
                  ),
                )}
                initialValue={`${selectedDistrict}`}
                displayLabel={"Select Election District"}
                onSelect={handleDistrictChange}
              />
            </div>
          )}
      </Card>
      <h1 className="primary-header pt-2">{getCommitteeListHeader()}</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <div className="pt-2 pb-4">
            {committeeList.length > 0 ? (
              <div className="flex gap-4 w-full flex-wrap min-h-66 h-max">
                {committeeList.map((member) => (
                  <div key={member.VRCNUM}>
                    <Card className="w-full min-w-[600px] h-full flex flex-col">
                      <CardContent className="flex-1">
                        <VoterCard record={member} committee={true} />
                      </CardContent>
                      <CardFooter className="h-full">
                        {hasPermissionFor(
                          actingPermissions,
                          PrivilegeLevel.Admin,
                        ) && (
                          <div className="h-full">
                            <Button
                              className="mt-auto"
                              onClick={(e) =>
                                handleRemoveCommitteeMember(e, member.VRCNUM)
                              }
                              disabled={removeCommitteeMemberMutation.loading}
                            >
                              {removeCommitteeMemberMutation.loading
                                ? "Removing..."
                                : "Remove from Committee"}
                            </Button>
                          </div>
                        )}
                        {actingPermissions === PrivilegeLevel.RequestAccess && (
                          <Button
                            onClick={(e) => handleRequestRemove(e, member)}
                          >
                            Remove or Replace Member
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <p>{noContentMessage()}</p>
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

export default CommitteeSelector;
