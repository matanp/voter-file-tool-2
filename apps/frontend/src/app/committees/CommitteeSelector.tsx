"use client";
import React, { useCallback, useContext, useMemo, useState } from "react";

import {
  type MembershipType,
  PrivilegeLevel,
  type CommitteeList,
  type RemovalReason,
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useApiMutation } from "~/hooks/useApiMutation";
import { useToast } from "~/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

/** SRS 2.5 — Friendly labels for removal reason dropdown. */
const REMOVAL_REASON_LABELS: Record<RemovalReason, string> = {
  PARTY_CHANGE: "Party change",
  MOVED_OUT_OF_DISTRICT: "Moved out of district",
  INACTIVE_REGISTRATION: "Inactive registration",
  DECEASED: "Deceased",
  OTHER: "Other",
};

interface CommitteeSelectorProps {
  committeeLists: CommitteeList[];
}

type DesignationWeightSummary = NonNullable<
  FetchCommitteeListResponse["designationWeightSummary"]
>;

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
    Array<{
      voterRecord: VoterRecord;
      membershipType: MembershipType | null;
      seatNumber?: number | null;
      submissionMetadata?: { email?: string; phone?: string } | null;
    }>
  >([]);
  const [maxSeatsPerLted, setMaxSeatsPerLted] = useState<number>(4);
  const [selectedCommitteeId, setSelectedCommitteeId] = useState<
    number | null
  >(null);
  const [ltedWeight, setLtedWeight] = useState<number | null>(null);
  const [ltedWeightInput, setLtedWeightInput] = useState<string>("");
  const [seats, setSeats] = useState<
    Array<{ seatNumber: number; isPetitioned: boolean; weight: number | string | null }>
  >([]);
  const [designationWeightSummary, setDesignationWeightSummary] =
    useState<DesignationWeightSummary | null>(null);
  const [showConfirmForm, setShowConfirmForm] = useState<boolean>(false);
  const [requestRemoveRecord, setRequestRemoveRecord] =
    useState<VoterRecord | null>(null);
  const [legDistricts, setLegDistricts] = useState<string[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [resignModalMember, setResignModalMember] =
    useState<VoterRecord | null>(null);
  const [resignDateReceived, setResignDateReceived] = useState<string>("");
  const [resignMethod, setResignMethod] = useState<"EMAIL" | "MAIL" | "">("");
  const [resignNotes, setResignNotes] = useState<string>("");
  const [removeModalMember, setRemoveModalMember] =
    useState<VoterRecord | null>(null);
  const [removeReason, setRemoveReason] = useState<RemovalReason | "">("");
  const [removeNotes, setRemoveNotes] = useState<string>("");

  const [listLoading, setListLoading] = useState<boolean>(false);

  type RemoveOrResignPayload = {
    cityTown: string;
    legDistrict?: number;
    electionDistrict: number;
    memberId: string;
    action?: "RESIGN";
    resignationDateReceived?: string;
    resignationMethod?: "EMAIL" | "MAIL";
    removalNotes?: string;
    removalReason?: RemovalReason;
  };

  const removeCommitteeMemberMutation = useApiMutation<
    { status: "success" | "error"; error?: string },
    RemoveOrResignPayload
  >("/api/committee/remove", "POST", {
    onSuccess: (data, payload) => {
      setRemovingId(null);
      if (payload && "action" in payload && payload.action === "RESIGN") {
        setResignModalMember(null);
        setResignDateReceived("");
        setResignMethod("");
        setResignNotes("");
      } else {
        setRemoveModalMember(null);
        setRemoveReason("");
        setRemoveNotes("");
      }
      // Check for server-reported failure (200 with { status: "error" })
      if (
        data &&
        typeof data === "object" &&
        "status" in data &&
        data.status === "error"
      ) {
        toast({
          title: "Error",
          description: `Failed to ${payload?.action === "RESIGN" ? "record resignation" : "remove committee member"}: ${data.error ?? "Unknown error"}`,
          variant: "destructive",
        });
        return;
      }

      if (payload) {
        const legDistrictString = payload.legDistrict
          ? payload.legDistrict.toString()
          : undefined;

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
        description:
          payload?.action === "RESIGN"
            ? "Resignation recorded successfully"
            : "Committee member removed successfully",
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

  const updateLtedWeightMutation = useApiMutation<
    { success: boolean },
    { committeeListId: number; ltedWeight: number | null }
  >("/api/committee/updateLtedWeight", "PATCH", {
    onSuccess: () => {
      toast({ title: "LTED weight updated" });
      if (selectedCity && selectedDistrict >= 0) {
        fetchCommitteeList(
          selectedCity,
          selectedDistrict,
          selectedLegDistrict || undefined,
        ).catch(console.error);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update LTED weight: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSaveLtedWeight = () => {
    if (selectedCommitteeId == null) return;
    const trimmed = ltedWeightInput.trim();
    const value = trimmed === "" ? null : Number(trimmed);
    if (value !== null && (Number.isNaN(value) || value < 0)) {
      toast({
        title: "Invalid weight",
        description: "LTED weight must be a non-negative number",
        variant: "destructive",
      });
      return;
    }
    void updateLtedWeightMutation.mutate({
      committeeListId: selectedCommitteeId,
      ltedWeight: value,
    });
  };

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
    setSelectedCommitteeId(null);
    setLtedWeight(null);
    setLtedWeightInput("");
    setSeats([]);
    setDesignationWeightSummary(null);
  };

  const handleLegChange = (legDistrict: string) => {
    if (legDistrict === selectedLegDistrict) {
      setSelectedLegDistrict("");
    } else {
      setSelectedLegDistrict(legDistrict);
    }

    setSelectedDistrict(-1);
    setMemberships([]);
    setSelectedCommitteeId(null);
    setLtedWeight(null);
    setLtedWeightInput("");
    setSeats([]);
    setDesignationWeightSummary(null);
  };

  const fetchCommitteeList = useCallback(
    async (city: string, district: number, legDistrict?: string) => {
      setListLoading(true);
      try {
        const params = new URLSearchParams({
          cityTown: city,
          electionDistrict: String(district),
          includeDesignationWeightSummary: "true",
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
              seatNumber: m.seatNumber ?? null,
              submissionMetadata: m.submissionMetadata ?? null,
            })) ?? [],
          );
          setMaxSeatsPerLted(data.maxSeatsPerLted ?? 4);
          setSelectedCommitteeId(data.id);
          const w = data.ltedWeight;
          setLtedWeight(
            w != null ? (typeof w === "number" ? w : Number(w)) : null,
          );
          setLtedWeightInput(
            w != null ? String(w) : "",
          );
          setSeats(
            data.seats?.map((s) => ({
              seatNumber: s.seatNumber,
              isPetitioned: s.isPetitioned,
              weight: s.weight,
            })) ?? [],
          );
          setDesignationWeightSummary(data.designationWeightSummary ?? null);
        } else if (response.status === 403) {
          setMemberships([]);
          setSelectedCommitteeId(null);
          setLtedWeight(null);
          setLtedWeightInput("");
          setSeats([]);
          setDesignationWeightSummary(null);
        } else {
          setMemberships([]);
          setSelectedCommitteeId(null);
          setLtedWeight(null);
          setLtedWeightInput("");
          setSeats([]);
          setDesignationWeightSummary(null);
        }
      } catch (error) {
        console.error("Error fetching committee list:", error);
        setMemberships([]);
        setSelectedCommitteeId(null);
        setLtedWeight(null);
        setLtedWeightInput("");
        setSeats([]);
        setDesignationWeightSummary(null);
      } finally {
        setListLoading(false);
      }
    },
    [],
  );

  const handleOpenRemoveModal = (record: VoterRecord) => {
    setRemoveModalMember(record);
    setRemoveReason("");
    setRemoveNotes("");
  };

  const handleSubmitRemoval = () => {
    if (
      !removeModalMember ||
      !selectedCity ||
      selectedDistrict < 0 ||
      removeReason === "" ||
      (removeReason === "OTHER" && !removeNotes.trim())
    ) {
      return;
    }
    setRemovingId(removeModalMember.VRCNUM);
    const legDistrictNumber = selectedLegDistrict
      ? Number(selectedLegDistrict)
      : undefined;
    void removeCommitteeMemberMutation.mutate({
      cityTown: selectedCity,
      legDistrict: legDistrictNumber,
      electionDistrict: selectedDistrict,
      memberId: removeModalMember.VRCNUM,
      removalReason: removeReason,
      ...(removeNotes.trim() ? { removalNotes: removeNotes.trim() } : {}),
    });
  };

  const handleOpenResignModal = (record: VoterRecord) => {
    setResignModalMember(record);
    setResignDateReceived("");
    setResignMethod("");
    setResignNotes("");
  };

  const handleSubmitResignation = () => {
    if (
      !resignModalMember ||
      !selectedCity ||
      selectedDistrict < 0 ||
      !resignDateReceived.trim() ||
      (resignMethod !== "EMAIL" && resignMethod !== "MAIL")
    ) {
      return;
    }
    setRemovingId(resignModalMember.VRCNUM);
    const legDistrictNumber = selectedLegDistrict
      ? Number(selectedLegDistrict)
      : undefined;
    void removeCommitteeMemberMutation.mutate({
      cityTown: selectedCity,
      legDistrict: legDistrictNumber,
      electionDistrict: selectedDistrict,
      memberId: resignModalMember.VRCNUM,
      action: "RESIGN",
      resignationDateReceived: resignDateReceived.trim(),
      resignationMethod: resignMethod,
      ...(resignNotes.trim() ? { removalNotes: resignNotes.trim() } : {}),
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

  /** SRS 2.7 — Vacancy count from seat occupancy. */
  const vacancyCount = useMemo(() => {
    if (seats.length === 0) return null;
    const occupiedSeatNumbers = new Set(
      memberships
        .map((m) => m.seatNumber)
        .filter((seatNumber): seatNumber is number => seatNumber != null),
    );
    return Math.max(seats.length - occupiedSeatNumbers.size, 0);
  }, [seats, memberships]);

  const designationDisplayWeight = useMemo(() => {
    if (!designationWeightSummary) return null;
    const hasAnyWeightSource = designationWeightSummary.seats.some(
      (seat) => seat.isPetitioned && seat.seatWeight != null,
    );
    if (!hasAnyWeightSource) return null;
    return parseFloat(designationWeightSummary.totalWeight.toFixed(4));
  }, [designationWeightSummary]);

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
          {selectedCommitteeId != null &&
            hasPermissionFor(actingPermissions, PrivilegeLevel.Admin) && (
              <div className="pt-2 pb-4 flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="lted-weight">LTED Total Weight</Label>
                  <Input
                    id="lted-weight"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Enter weight"
                    value={ltedWeightInput}
                    onChange={(e) => setLtedWeightInput(e.target.value)}
                    className="w-32"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleSaveLtedWeight}
                  disabled={updateLtedWeightMutation.loading}
                >
                  {updateLtedWeightMutation.loading ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          {selectedCommitteeId != null &&
            designationWeightSummary &&
            vacancyCount != null && (
            <div className="pt-2 pb-4 flex gap-6">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Vacancy</span>
                <span className="font-semibold text-lg">
                  {vacancyCount}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  Designation Weight
                </span>
                <span className="font-semibold text-lg">
                  {designationDisplayWeight != null
                    ? designationDisplayWeight
                    : "—"}
                </span>
              </div>
            </div>
          )}
          {selectedCommitteeId != null &&
            designationWeightSummary &&
            hasPermissionFor(actingPermissions, PrivilegeLevel.Admin) && (
              <div className="pt-2 pb-4">
                <h2 className="font-semibold pb-2">
                  Designation Weight Verification
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-primary-200">
                    <thead className="bg-primary-100">
                      <tr>
                        <th className="text-left px-2 py-1">Seat</th>
                        <th className="text-left px-2 py-1">Petitioned</th>
                        <th className="text-left px-2 py-1">Occupied</th>
                        <th className="text-left px-2 py-1">Contribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {designationWeightSummary.seats.map((seat) => (
                        <tr
                          key={`designation-breakdown-${String(seat.seatNumber)}`}
                          className="border-t border-primary-200"
                        >
                          <td className="px-2 py-1">{seat.seatNumber}</td>
                          <td className="px-2 py-1">
                            {seat.isPetitioned ? "Yes" : "No"}
                          </td>
                          <td className="px-2 py-1">
                            {seat.isOccupied ? "Yes" : "No"}
                          </td>
                          <td className="px-2 py-1">
                            {seat.contributes
                              ? seat.contributionWeight.toFixed(4)
                              : seat.isPetitioned && seat.seatWeight == null
                                ? "—"
                                : "0.0000"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          {selectedCommitteeId != null && seats.length > 0 && (
            <div className="pt-2 pb-4">
              <h2 className="font-semibold pb-2">Seat Roster</h2>
              <div className="grid gap-2">
                {seats.map((seat) => {
                  const occupant = memberships.find(
                    (m) => m.seatNumber === seat.seatNumber,
                  );
                  const weightStr =
                    seat.weight != null ? String(seat.weight) : "—";
                  return (
                    <div
                      key={seat.seatNumber}
                      className="flex gap-4 items-center py-1 border-b border-primary-200"
                    >
                      <span className="w-8 font-medium">
                        Seat {seat.seatNumber}
                      </span>
                      <span className="flex-1">
                        {occupant
                          ? [occupant.voterRecord.lastName, occupant.voterRecord.firstName]
                              .filter(Boolean)
                              .join(", ") || occupant.voterRecord.VRCNUM
                          : "—"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {seat.isPetitioned ? "Petitioned" : "Appointed"}
                      </span>
                      <span className="w-16 text-right">{weightStr}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="pt-2 pb-4">
            {memberships.length > 0 ? (
              <div className="flex gap-4 w-full flex-wrap min-h-66 h-max">
                {memberships.map(
                  ({ voterRecord, membershipType, submissionMetadata }) => (
                  <div key={voterRecord.VRCNUM}>
                    <Card className="w-full min-w-[600px] h-full flex flex-col">
                      <CardContent className="flex-1">
                        <VoterCard
                          record={voterRecord}
                          committee={true}
                          membershipType={membershipType}
                          submissionMetadata={submissionMetadata}
                        />
                      </CardContent>
                      <CardFooter className="h-full">
                        {hasPermissionFor(
                          actingPermissions,
                          PrivilegeLevel.Admin,
                        ) && (
                          <div className="h-full flex flex-wrap gap-2">
                            <Button
                              className="mt-auto"
                              type="button"
                              variant="outline"
                              onClick={() => handleOpenResignModal(voterRecord)}
                              disabled={
                                removingId === voterRecord.VRCNUM ||
                                removeCommitteeMemberMutation.loading
                              }
                            >
                              Record Resignation
                            </Button>
                            <Button
                              className="mt-auto"
                              type="button"
                              variant="outline"
                              aria-busy={removingId === voterRecord.VRCNUM}
                              onClick={() => handleOpenRemoveModal(voterRecord)}
                              disabled={removingId === voterRecord.VRCNUM}
                            >
                              Remove Member
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
                  ),
                )}
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

      <Dialog
        open={resignModalMember !== null}
        onOpenChange={(open) => {
          if (!open) setResignModalMember(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Resignation</DialogTitle>
          </DialogHeader>
          {resignModalMember && (
            <p className="text-sm text-muted-foreground">
              Recording resignation for {resignModalMember.firstName}{" "}
              {resignModalMember.lastName} ({resignModalMember.VRCNUM}).
            </p>
          )}
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="resign-date">Date resignation received *</Label>
              <Input
                id="resign-date"
                type="date"
                value={resignDateReceived}
                onChange={(e) => setResignDateReceived(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resign-method">Method *</Label>
              <Select
                value={resignMethod}
                onValueChange={(v) =>
                  setResignMethod(v === "EMAIL" || v === "MAIL" ? v : "")
                }
              >
                <SelectTrigger id="resign-method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="MAIL">Mail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resign-notes">Notes (optional)</Label>
              <Textarea
                id="resign-notes"
                value={resignNotes}
                onChange={(e) => setResignNotes(e.target.value)}
                placeholder="Optional resignation note"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setResignModalMember(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitResignation}
              disabled={
                !resignDateReceived.trim() ||
                (resignMethod !== "EMAIL" && resignMethod !== "MAIL") ||
                removeCommitteeMemberMutation.loading
              }
            >
              {removeCommitteeMemberMutation.loading ? "Saving..." : "Record Resignation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={removeModalMember !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveModalMember(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>
          {removeModalMember && (
            <p className="text-sm text-muted-foreground">
              Removing {removeModalMember.firstName} {removeModalMember.lastName}{" "}
              ({removeModalMember.VRCNUM}) from the committee. This is an
              administrative removal (not a resignation).
            </p>
          )}
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="remove-reason">Reason for removal *</Label>
              <Select
                value={removeReason}
                onValueChange={(v) =>
                  setRemoveReason(
                    v === ""
                      ? ""
                      : (v as RemovalReason),
                  )
                }
              >
                <SelectTrigger id="remove-reason">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(REMOVAL_REASON_LABELS) as RemovalReason[]).map(
                    (reason) => (
                      <SelectItem key={reason} value={reason}>
                        {REMOVAL_REASON_LABELS[reason]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="remove-notes">
                Notes {removeReason === "OTHER" ? "*" : "(optional)"}
              </Label>
              <Textarea
                id="remove-notes"
                value={removeNotes}
                onChange={(e) => setRemoveNotes(e.target.value)}
                placeholder={
                  removeReason === "OTHER"
                    ? "Required when reason is Other"
                    : "Optional note"
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoveModalMember(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitRemoval}
              disabled={
                removeReason === "" ||
                (removeReason === "OTHER" && !removeNotes.trim()) ||
                removeCommitteeMemberMutation.loading
              }
            >
              {removeCommitteeMemberMutation.loading
                ? "Removing..."
                : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommitteeSelector;
