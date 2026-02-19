"use client";
import React, { useCallback, useContext, useState } from "react";

import {
  type MembershipType,
  PrivilegeLevel,
  type CommitteeList,
  type VoterRecord,
} from "@prisma/client";
import type { FetchCommitteeListResponse } from "~/lib/validations/committee";
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
  const [memberships, setMemberships] = useState<
    Array<{ voterRecord: VoterRecord; membershipType: MembershipType | null }>
  >([]);
  const [maxSeatsPerLted, setMaxSeatsPerLted] = useState<number>(4);
  const [showConfirmForm, setShowConfirmForm] = useState<boolean>(false);
  const [requestRemoveRecord, setRequestRemoveRecord] =
    useState<VoterRecord | null>(null);
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

    setMemberships([]);
  };

  const handleLegChange = (legDistrict: string) => {
    if (legDistrict === selectedLegDistrict) {
      setSelectedLegDistrict("");
    } else {
      setSelectedLegDistrict(legDistrict);
    }

    setSelectedDistrict(-1);
    setMemberships([]);
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
        const response = await fetch(
          `/api/fetchCommitteeList/?${params.toString()}`,
        );
        if (response.ok) {
          const data = (await response.json()) as FetchCommitteeListResponse;
          setMemberships(
            data.memberships?.map((m) => ({
              voterRecord: m.voterRecord,
              membershipType: m.membershipType ?? null,
            })) ?? [],
          );
          setMaxSeatsPerLted(data.maxSeatsPerLted ?? 4);
        } else if (response.status === 403) {
          // User doesn't have permission to view member data
          setMemberships([]);
        } else {
          setMemberships([]);
        }
      } catch (error) {
        console.error("Error fetching committee list:", error);
        setMemberships([]);
      } finally {
        setListLoading(false);
      }
    },
    [setListLoading, setMemberships],
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

      {listLoading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <div className="pt-2 pb-4">
            {memberships.length > 0 ? (
              <div className="flex gap-4 w-full flex-wrap min-h-66 h-max">
                {memberships.map(({ voterRecord, membershipType }) => (
                  <div key={voterRecord.VRCNUM}>
                    <Card className="w-full min-w-[600px] h-full flex flex-col">
                      <CardContent className="flex-1">
                        <VoterCard
                          record={voterRecord}
                          committee={true}
                          membershipType={membershipType}
                        />
                      </CardContent>
                      <CardFooter className="h-full">
                        {hasPermissionFor(
                          actingPermissions,
                          PrivilegeLevel.Admin,
                        ) && (
                          <div className="h-full">
                            <Button
                              className="mt-auto"
                              type="button"
                              aria-busy={removingId === voterRecord.VRCNUM}
                              onClick={() =>
                                handleRemoveCommitteeMember(voterRecord.VRCNUM)
                              }
                              disabled={removingId === voterRecord.VRCNUM}
                            >
                              {removingId === voterRecord.VRCNUM
                                ? "Removing..."
                                : "Remove from Committee"}
                            </Button>
                          </div>
                        )}
                        {actingPermissions === PrivilegeLevel.RequestAccess && (
                          <Button
                            onClick={(e) =>
                              handleRequestRemove(e, voterRecord)
                            }
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
            committeeList={memberships.map((m) => m.voterRecord)}
            maxSeatsPerLted={maxSeatsPerLted}
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
          maxSeatsPerLted={maxSeatsPerLted}
          defaultOpen={showConfirmForm}
          onOpenChange={setShowConfirmForm}
          committeeList={memberships.map((m) => m.voterRecord)}
          onSubmit={() => setShowConfirmForm(false)}
        />
      )}
    </div>
  );
};

export default CommitteeSelector;
