"use client";

/**
 * SRS 3.1 — Admin users client: table of Leader+ users with jurisdiction management.
 */

import React, { useCallback, useState } from "react";
import { PrivilegeLevel } from "@prisma/client";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { ComboboxDropdown } from "~/components/ui/ComboBox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { useToast } from "~/components/ui/use-toast";
import { useApiMutation } from "~/hooks/useApiMutation";
import type { UserWithJurisdictions, JurisdictionMeta } from "./page";

type JurisdictionRow = UserWithJurisdictions["jurisdictions"][number];

interface UsersClientProps {
  users: UserWithJurisdictions[];
  activeTermId: string;
  jurisdictionMeta: JurisdictionMeta;
}

type AssignJurisdictionPayload = {
  userId: string;
  cityTown: string;
  legDistrict?: number;
  termId: string;
};

type AssignJurisdictionResponse = {
  success: true;
  jurisdiction: {
    id: string;
    userId: string;
    cityTown: string;
    legDistrict: number | null;
    createdAt: string;
  };
};

/** Maps a PrivilegeLevel to a human-readable label. */
function roleLabel(privilegeLevel: PrivilegeLevel): string {
  switch (privilegeLevel) {
    case PrivilegeLevel.Developer:
      return "Developer";
    case PrivilegeLevel.Admin:
      return "Admin";
    case PrivilegeLevel.Leader:
      return "Leader";
    default:
      return privilegeLevel;
  }
}

export function UsersClient({
  users: initialUsers,
  activeTermId,
  jurisdictionMeta: { cityTowns, legDistrictsByCity },
}: UsersClientProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithJurisdictions[]>(initialUsers);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [addCity, setAddCity] = useState<string>("");
  const [addLegDistrict, setAddLegDistrict] = useState<string>("");
  const [addForUserId, setAddForUserId] = useState<string | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<{
    userId: string;
    jurisdiction: JurisdictionRow;
  } | null>(null);

  const assignMutation = useApiMutation<
    AssignJurisdictionResponse,
    AssignJurisdictionPayload
  >("/api/admin/jurisdictions", "POST", {
    onSuccess: (data, payload) => {
      toast({ title: "Jurisdiction assigned" });
      const j = data.jurisdiction;
      const targetUserId = payload?.userId;
      setUsers((prev) =>
        prev.map((u) =>
          targetUserId != null && u.id === targetUserId
            ? {
                ...u,
                jurisdictions: [
                  ...u.jurisdictions,
                  {
                    id: j.id,
                    cityTown: j.cityTown,
                    legDistrict: j.legDistrict,
                    createdAt:
                      typeof j.createdAt === "string"
                        ? j.createdAt
                        : new Date(j.createdAt).toISOString(),
                  },
                ],
              }
            : u,
        ),
      );
      setAddCity("");
      setAddLegDistrict("");
      setAddForUserId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useApiMutation<{ success: true }, void>(
    "/api/admin/jurisdictions/[id]",
    "DELETE",
    {
      onSuccess: () => {
        if (!removeConfirm) return;
        toast({ title: "Jurisdiction removed" });
        setUsers((prev) =>
          prev.map((u) =>
            u.id === removeConfirm.userId
              ? {
                  ...u,
                  jurisdictions: u.jurisdictions.filter(
                    (j) => j.id !== removeConfirm.jurisdiction.id,
                  ),
                }
              : u,
          ),
        );
        setRemoveConfirm(null);
      },
      onError: (err: Error) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
        setRemoveConfirm(null);
      },
    },
  );

  const handleAddJurisdiction = useCallback(
    (userId: string) => {
      if (!addCity.trim()) return;
      const legDistrictNum =
        addLegDistrict.trim() === ""
          ? undefined
          : Number(addLegDistrict);
      if (addLegDistrict.trim() !== "" && Number.isNaN(legDistrictNum)) return;
      assignMutation.mutate({
        userId,
        cityTown: addCity.trim(),
        legDistrict: legDistrictNum,
        termId: activeTermId,
      });
    },
    [addCity, addLegDistrict, activeTermId, assignMutation],
  );

  const handleRemoveClick = useCallback(
    (userId: string, jurisdiction: JurisdictionRow) => {
      setRemoveConfirm({ userId, jurisdiction });
    },
    [],
  );

  const handleRemoveConfirm = useCallback(() => {
    if (!removeConfirm) return;
    deleteMutation.mutate(
      undefined,
      `/api/admin/jurisdictions/${removeConfirm.jurisdiction.id}`,
    );
  }, [removeConfirm, deleteMutation]);

  const cityItems = cityTowns.map((c) => ({ value: c, label: c }));
  const selectedUser = addForUserId ? users.find((u) => u.id === addForUserId) : null;
  const legDistrictOptions = selectedUser && addCity
    ? (legDistrictsByCity[addCity] ?? []).map((n) => ({
        value: String(n),
        label: String(n),
      }))
    : [];

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Role</th>
              <th className="text-left p-3 font-medium">Jurisdictions</th>
              <th className="text-left p-3 font-medium w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isExpanded = expandedUserId === user.id;
              const isLeader = user.privilegeLevel === PrivilegeLevel.Leader;
              const jurisdictionCount = user.jurisdictions.length;
              return (
                <React.Fragment key={user.id}>
                  <tr className="border-t">
                    <td className="p-3">{user.name ?? "—"}</td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">{roleLabel(user.privilegeLevel)}</td>
                    <td className="p-3">
                      {isLeader ? jurisdictionCount : "—"}
                    </td>
                    <td className="p-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (isExpanded) {
                            setExpandedUserId(null);
                            setAddForUserId(null);
                            setAddCity("");
                            setAddLegDistrict("");
                          } else {
                            setExpandedUserId(user.id);
                            setAddForUserId(user.id);
                            setAddCity("");
                            setAddLegDistrict("");
                          }
                        }}
                      >
                        {isExpanded ? "Hide" : "Manage"}
                      </Button>
                    </td>
                  </tr>
                  {isExpanded && isLeader && (
                    <tr className="border-t bg-muted/20">
                      <td colSpan={5} className="p-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <span className="font-medium">
                              Jurisdictions for {user.name ?? user.email}
                            </span>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {user.jurisdictions.length === 0 ? (
                              <p className="text-muted-foreground text-sm">
                                No jurisdictions assigned. Add one below.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {user.jurisdictions.map((j) => (
                                  <div
                                    key={j.id}
                                    className="flex items-center justify-between py-2 border-b last:border-0"
                                  >
                                    <span className="text-sm">
                                      {j.cityTown}
                                      {j.legDistrict != null
                                        ? ` — LD ${j.legDistrict}`
                                        : " (all districts)"}{" "}
                                      — assigned{" "}
                                      {new Date(
                                        j.createdAt,
                                      ).toLocaleDateString()}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleRemoveClick(user.id, j)
                                      }
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="pt-2 border-t">
                              <p className="text-sm font-medium mb-2">
                                Add jurisdiction
                              </p>
                              <div className="flex flex-wrap gap-4 items-end">
                                <div className="space-y-1">
                                  <Label>City/Town</Label>
                                  <ComboboxDropdown
                                    items={cityItems}
                                    initialValue={addForUserId === user.id ? addCity : ""}
                                    displayLabel="Select city"
                                    onSelect={(v) => {
                                      setAddForUserId(user.id);
                                      setAddCity(v);
                                      setAddLegDistrict("");
                                    }}
                                    ariaLabel="City or town"
                                  />
                                </div>
                                {addCity && (
                                  <div className="space-y-1">
                                    <Label>Leg district (optional)</Label>
                                    <ComboboxDropdown
                                      items={[
                                        { value: "", label: "All districts" },
                                        ...legDistrictsByCity[addCity]?.map(
                                          (n) => ({
                                            value: String(n),
                                            label: String(n),
                                          }),
                                        ) ?? [],
                                      ]}
                                      initialValue={addForUserId === user.id ? addLegDistrict : ""}
                                      displayLabel="Select district"
                                      onSelect={(v) => {
                                        setAddForUserId(user.id);
                                        setAddLegDistrict(v);
                                      }}
                                      ariaLabel="Legislative district"
                                    />
                                  </div>
                                )}
                                <Button
                                  size="sm"
                                  disabled={
                                    !addCity ||
                                    assignMutation.loading ||
                                    (() => {
                                      const legVal =
                                        addLegDistrict.trim() === ""
                                          ? null
                                          : Number(addLegDistrict);
                                      if (
                                        addLegDistrict.trim() !== "" &&
                                        Number.isNaN(Number(addLegDistrict))
                                      )
                                        return true;
                                      const exists = user.jurisdictions.some(
                                        (j) =>
                                          j.cityTown === addCity &&
                                          (j.legDistrict === legVal ||
                                            (j.legDistrict == null &&
                                              legVal === null)),
                                      );
                                      return exists;
                                    })()
                                  }
                                  onClick={() => handleAddJurisdiction(user.id)}
                                >
                                  Add
                                </Button>
                              </div>
                              {(() => {
                                const legVal =
                                  addLegDistrict.trim() === ""
                                    ? null
                                    : Number(addLegDistrict);
                                const exists =
                                  addCity &&
                                  user.jurisdictions.some(
                                    (j) =>
                                      j.cityTown === addCity &&
                                      (j.legDistrict === legVal ||
                                        (j.legDistrict == null &&
                                          legVal === null)),
                                  );
                                return exists ? (
                                  <p className="text-sm text-amber-600 mt-2">
                                    This jurisdiction is already assigned.
                                  </p>
                                ) : null;
                              })()}
                            </div>
                          </CardContent>
                        </Card>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog
        open={removeConfirm !== null}
        onOpenChange={(open) => !open && setRemoveConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove jurisdiction?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the jurisdiction assignment. The user will no longer
            have access to committees in this area for the current term.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveConfirm}
              disabled={deleteMutation.loading}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
