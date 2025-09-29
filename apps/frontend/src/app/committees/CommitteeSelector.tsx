"use client";
import React, { useCallback, useState } from "react";

import { type CommitteeList } from "@prisma/client";
import { type VoterRecordAPI } from "@voter-file-tool/shared-validators";
import { Button } from "~/components/ui/button";
import { VoterCard } from "~/app/recordsearch/RecordsList";
import { ComboboxDropdown } from "~/components/ui/ComboBox";
import { useCommitteePermissions } from "~/hooks/useCommitteePermissions";
import CommitteeRequestForm from "./CommitteeRequestForm";
import { AddCommitteeForm } from "./AddCommitteeForm";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { useApiMutation } from "~/hooks/useApiMutation";
import { useToast } from "~/components/ui/use-toast";
import { typeSafeFetch } from "~/lib/validators/api";
import { committeeWithMembersSchema } from "~/lib/validators/committee";
import { requiresLegislativeDistrict } from "~/lib/utils/committee";
import { COMMITTEE_MESSAGES } from "~/lib/constants/committee";

interface CommitteeSelectorProps {
  committeeLists: CommitteeList[];
}

const CommitteeSelector: React.FC<CommitteeSelectorProps> = ({
  committeeLists,
}) => {
  const { toast } = useToast();
  const { isAdmin, canRequest } = useCommitteePermissions();
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedLegDistrict, setSelectedLegDistrict] = useState<string>("");
  const [useLegDistrict, setUseLegDistrict] = useState<boolean>(false);
  const [selectedDistrict, setSelectedDistrict] = useState<number>(-1);
  const [committeeList, setCommitteeList] = useState<VoterRecordAPI[]>([]);
  const [showConfirmForm, setShowConfirmForm] = useState<boolean>(false);
  const [requestRemoveRecord, setRequestRemoveRecord] =
    useState<VoterRecordAPI | null>(null);
  const [legDistricts, setLegDistricts] = useState<string[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [listLoading, setListLoading] = useState<boolean>(false);

  const removeCommitteeMemberMutation = useApiMutation<
    { status: "success" | "error"; error?: string },
    {
      cityTown: string;
      legDistrict?: number;
      electionDistrict: number;
      memberId: string;
    }
  >("/api/committee/remove", "POST", {
    onSuccess: (data, payload) => {
      setRemovingId(null);
      // Check for server-reported failure (200 with { status: "error" })
      if (
        data &&
        typeof data === "object" &&
        "status" in data &&
        data.status === "error"
      ) {
        toast({
          title: "Error",
          description: `Failed to remove committee member: ${data.error ?? "Unknown error"}`,
          variant: "destructive",
        });
        return;
      }

      if (payload) {
        // Convert numeric legDistrict back to string for fetchCommitteeList
        const legDistrictString = payload.legDistrict
          ? payload.legDistrict.toString()
          : undefined;

        // Only refetch if we have valid parameters
        if (payload.cityTown && payload.electionDistrict !== undefined) {
          fetchCommitteeList(
            payload.cityTown,
            payload.electionDistrict,
            legDistrictString,
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
      setRemovingId(null);
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
    setUseLegDistrict(requiresLegislativeDistrict(city));

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
      setListLoading(true);
      try {
        const params = new URLSearchParams({
          cityTown: city,
          electionDistrict: String(district),
        });
        if (legDistrict) params.set("legDistrict", legDistrict);

        const result = await typeSafeFetch(
          `/api/fetchCommitteeList/?${params.toString()}`,
          { method: "GET" },
          committeeWithMembersSchema,
        );

        if (result.success && result.data) {
          setCommitteeList(result.data.committeeMemberList);
        } else if (result.error?.includes("403")) {
          // User doesn't have permission to view member data
          setCommitteeList([]);
        } else {
          console.error("Error fetching committee list:", result.error);
          console.error("Result details:", result);
          setCommitteeList([]);
        }
      } catch (error) {
        console.error("Error fetching committee list:", error);
        setCommitteeList([]);
      } finally {
        setListLoading(false);
      }
    },
    [setListLoading, setCommitteeList],
  );

  const handleRemoveCommitteeMember = async (vrcnum: string) => {
    // Guard against invalid selection
    if (!selectedCity || selectedDistrict < 0) {
      return;
    }

    setRemovingId(vrcnum);

    // Convert legDistrict string to number for API call
    const legDistrictNumber = selectedLegDistrict
      ? Number(selectedLegDistrict)
      : undefined;

    void removeCommitteeMemberMutation.mutate({
      cityTown: selectedCity,
      legDistrict: legDistrictNumber,
      electionDistrict: selectedDistrict,
      memberId: vrcnum,
    });
  };

  const handleRequestRemove = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    record: VoterRecordAPI,
  ): Promise<void> => {
    e.preventDefault();

    setShowConfirmForm(true);
    setRequestRemoveRecord(record);
  };

  const noContentMessage = () => {
    if (!selectedCity || !selectedLegDistrict || selectedDistrict < 0) {
      return COMMITTEE_MESSAGES.SELECT_COMMITTEE;
    }

    if (!isAdmin) {
      return COMMITTEE_MESSAGES.NO_PERMISSION;
    }

    return COMMITTEE_MESSAGES.NO_MEMBERS;
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

      {listLoading ? (
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
                        {isAdmin && (
                          <div className="h-full">
                            <Button
                              className="mt-auto"
                              type="button"
                              aria-busy={removingId === member.VRCNUM}
                              onClick={() =>
                                handleRemoveCommitteeMember(member.VRCNUM)
                              }
                              disabled={removingId === member.VRCNUM}
                            >
                              {removingId === member.VRCNUM
                                ? "Removing..."
                                : "Remove from Committee"}
                            </Button>
                          </div>
                        )}
                        {canRequest && !isAdmin && (
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
