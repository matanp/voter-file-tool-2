"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ComboboxDropdown } from "~/components/ui/ComboBox";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { type Invite } from "@prisma/client";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Calendar, User, Mail, MapPin, AlertCircle } from "lucide-react";
import { useToast } from "~/components/ui/use-toast";
import { DeleteButton } from "~/components/ui/DeleteButton";
import { CopyButton } from "~/components/ui/CopyButton";
import { useApiMutation, useApiDelete } from "~/hooks/useApiMutation";
import {
  formatInviteDate,
  getPrivilegeColor,
  jurisdictionLabel,
  type SerializedInviteJurisdiction,
} from "~/lib/invites/display";
import type { JurisdictionMeta, TermOption } from "./page";

// A jurisdiction captured for a Leader invite (no userId yet — applied on signup).
type PendingJurisdiction = {
  cityTown: string;
  legDistrict: number | null;
  termId: string;
  termLabel: string;
};

// Type for serialized Invite data (dates as strings)
type SerializedInvite = Omit<Invite, "expiresAt" | "createdAt" | "usedAt"> & {
  expiresAt: string;
  createdAt: string;
  usedAt: string | null;
  token: string;
  jurisdictions: SerializedInviteJurisdiction[];
};

// Email validation only — the full payload (incl. jurisdictions) is validated server-side.
const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type InvitePrivilegeLevel = "Leader" | "Admin" | "RequestAccess" | "ReadAccess";

// Payload sent to POST /api/admin/invites. jurisdictions is required for Leader.
type CreateInviteData = {
  email: string;
  privilegeLevel: InvitePrivilegeLevel;
  customMessage?: string;
  expiresInDays?: number;
  jurisdictions?: Array<{
    cityTown: string;
    legDistrict?: number;
    termId: string;
  }>;
};

interface InvitesResponse {
  invites: SerializedInvite[];
}

interface InviteManagementProps {
  terms: TermOption[];
  jurisdictionMeta: JurisdictionMeta | null;
  activeTermId: string | null;
}

const EMPTY_FORM = (): {
  email: string;
  privilegeLevel: InvitePrivilegeLevel;
  customMessage: string;
  expiresInDays: number;
  jurisdictions: PendingJurisdiction[];
} => ({
  email: "",
  privilegeLevel: "ReadAccess",
  customMessage: "",
  expiresInDays: 7,
  jurisdictions: [],
});

export function InviteManagement({
  terms,
  jurisdictionMeta,
  activeTermId,
}: InviteManagementProps) {
  const { toast } = useToast();
  const [invites, setInvites] = useState<SerializedInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(EMPTY_FORM());
  const [emailError, setEmailError] = useState<string | null>(null);

  // Jurisdiction builder state (for Leader invites).
  // Scope is pinned to the active term — the city/LD options in jurisdictionMeta
  // are built from the active term's committee data, so allowing other terms here
  // would let an admin assign options that don't exist for that term. Per-term
  // assignment can be reintroduced once jurisdictionMeta is loaded per term.
  const builderTermId = activeTermId ?? "";
  const activeTermLabel =
    terms.find((t) => t.id === activeTermId)?.label ?? builderTermId;
  const [builderCity, setBuilderCity] = useState<string>("");
  const [builderLeg, setBuilderLeg] = useState<string>("");
  // Forces the comboboxes to remount (clearing their internal state) after an add.
  const [builderKey, setBuilderKey] = useState(0);

  const hasActiveTerm = activeTermId != null;
  const hasCommitteeData =
    jurisdictionMeta != null && jurisdictionMeta.cityTowns.length > 0;
  const canInviteLeader = hasActiveTerm && hasCommitteeData;

  const resetForm = useCallback(() => {
    setFormData(EMPTY_FORM());
    setBuilderCity("");
    setBuilderLeg("");
    setBuilderKey((k) => k + 1);
  }, []);

  // API mutation hooks
  const createInviteMutation = useApiMutation<
    SerializedInvite,
    CreateInviteData
  >("/api/admin/invites", "POST", {
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invite created successfully",
      });
      resetForm();
      void fetchInvites(); // Refresh the list
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create invite: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteInviteMutation = useApiDelete<{ success: boolean }>(
    "/api/admin/invites",
    {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Invite deleted successfully",
        });
        void fetchInvites(); // Refresh the list
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: `Failed to delete invite: ${error.message}`,
          variant: "destructive",
        });
      },
    },
  );

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError(null);
      return true;
    }

    try {
      emailSchema.parse({ email });
      setEmailError(null);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find((err) => err.path[0] === "email");
        if (fieldError) {
          setEmailError(fieldError.message);
        }
      }
      return false;
    }
  };

  const handleEmailChange = (email: string) => {
    setFormData((prev) => ({ ...prev, email }));
    validateEmail(email);
  };

  const fetchInvites = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/invites");
      if (response.ok) {
        const data = (await response.json()) as unknown as InvitesResponse;
        setInvites(data.invites);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch invites",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching invites:", error);
      toast({
        title: "Error",
        description: "Failed to fetch invites",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchInvites();
  }, [fetchInvites]);

  const isLeaderInvite = formData.privilegeLevel === "Leader";

  const legDistrictOptions =
    builderCity && jurisdictionMeta
      ? (jurisdictionMeta.legDistrictsByCity[builderCity] ?? []).map((n) => ({
          value: String(n),
          label: String(n),
        }))
      : [];

  const builderLegValue = builderLeg.trim() === "" ? null : Number(builderLeg);
  const builderDuplicate =
    !!builderCity &&
    formData.jurisdictions.some(
      (j) =>
        j.termId === builderTermId &&
        j.cityTown === builderCity &&
        j.legDistrict === builderLegValue,
    );

  const addJurisdiction = () => {
    if (!builderCity || !builderTermId) return;
    if (builderLeg.trim() !== "" && Number.isNaN(Number(builderLeg))) return;
    if (builderDuplicate) return;
    const term = terms.find((t) => t.id === builderTermId);
    setFormData((prev) => ({
      ...prev,
      jurisdictions: [
        ...prev.jurisdictions,
        {
          cityTown: builderCity,
          legDistrict: builderLegValue,
          termId: builderTermId,
          termLabel: term?.label ?? builderTermId,
        },
      ],
    }));
    setBuilderCity("");
    setBuilderLeg("");
    setBuilderKey((k) => k + 1);
  };

  const removeJurisdiction = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      jurisdictions: prev.jurisdictions.filter((_, i) => i !== index),
    }));
  };

  const createInvite = async () => {
    if (!formData.email || !formData.privilegeLevel) {
      toast({
        title: "Error",
        description: "Email and privilege level are required",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(formData.email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (isLeaderInvite && formData.jurisdictions.length === 0) {
      toast({
        title: "Error",
        description: "Add at least one jurisdiction for a Leader invite",
        variant: "destructive",
      });
      return;
    }

    await createInviteMutation.mutate({
      email: formData.email.trim(),
      privilegeLevel: formData.privilegeLevel,
      customMessage: formData.customMessage,
      expiresInDays: formData.expiresInDays,
      jurisdictions: isLeaderInvite
        ? formData.jurisdictions.map((j) => ({
            cityTown: j.cityTown,
            legDistrict: j.legDistrict ?? undefined,
            termId: j.termId,
          }))
        : undefined,
    });
  };

  const copyInviteUrl = async (invite: SerializedInvite) => {
    const baseUrl = window.location.origin;
    const inviteUrl = `${baseUrl}/auth/invite/${invite.token}`;
    await navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "Success",
      description: "Invite URL copied to clipboard",
    });
  };

  const deleteInvite = async (inviteId: string, email: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the invite for ${email}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    await deleteInviteMutation.mutate(
      undefined, // No payload needed since ID is in URL
      `/api/admin/invites?id=${inviteId}`,
    );
  };

  const cityItems = (jurisdictionMeta?.cityTowns ?? []).map((c) => ({
    value: c,
    label: c,
  }));

  const leaderDisabledForCreate =
    isLeaderInvite && (!canInviteLeader || formData.jurisdictions.length === 0);

  // First blocking reason for the Create button, shown beside it so a disabled
  // button always says why. null means the button is enabled (or merely busy).
  const createDisabledReason = ((): string | null => {
    if (!formData.email.trim()) {
      return "Enter an email address to create an invite.";
    }
    if (emailError) {
      return "Fix the email address above to create an invite.";
    }
    if (!leaderDisabledForCreate) {
      return null;
    }
    if (!hasActiveTerm) {
      return "Leader invites require an active committee term. Activate one in Admin → Terms.";
    }
    if (!hasCommitteeData) {
      return `The active term (${activeTermLabel}) has no committee cities or districts loaded, so there are no jurisdictions to assign.`;
    }
    return "Add at least one jurisdiction above for this Leader invite.";
  })();

  return (
    <div className="space-y-6">
      {/* Create Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className={
                  emailError ? "border-red-500 focus:border-red-500" : ""
                }
              />
              {emailError && (
                <p className="text-sm text-red-500">{emailError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="privilegeLevel">Privilege Level</Label>
              <Select
                value={formData.privilegeLevel}
                onValueChange={(value: InvitePrivilegeLevel) =>
                  setFormData((prev) => ({ ...prev, privilegeLevel: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ReadAccess">Read Access</SelectItem>
                  <SelectItem value="RequestAccess">Request Access</SelectItem>
                  {/* Deliberately selectable even when canInviteLeader is false:
                      the jurisdiction panel below explains what's missing, and
                      that explanation is unreachable if the option is disabled. */}
                  <SelectItem value="Leader">Leader</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SRS 3.1 — Jurisdiction scope for Leader invites */}
          {isLeaderInvite && (
            <div className="space-y-3 rounded-md border p-4">
              <div>
                <Label>Jurisdiction scope</Label>
                <p className="text-sm text-muted-foreground">
                  Leaders only see committees in their assigned areas. Add at
                  least one — these are applied automatically the first time the
                  invitee signs in.
                </p>
              </div>

              {!canInviteLeader ? (
                <Alert variant="warning">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {!hasActiveTerm
                      ? "Active term required"
                      : "Committee data required"}
                  </AlertTitle>
                  <AlertDescription>
                    {!hasActiveTerm ? (
                      <>
                        Leader invites require an active committee term.{" "}
                        <Link
                          href="/admin/terms"
                          className="font-medium underline underline-offset-4"
                        >
                          Activate a term in Admin → Terms
                        </Link>
                        .
                      </>
                    ) : (
                      <>
                        The active term is set, but no committee cities or
                        districts are loaded yet.{" "}
                        <Link
                          href="/admin"
                          className="font-medium underline underline-offset-4"
                        >
                          Load committee data in Admin → Data
                        </Link>
                        .
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Scope applies to the active term:{" "}
                    <span className="font-medium text-foreground">
                      {activeTermLabel}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1">
                      <Label>City/Town</Label>
                      <ComboboxDropdown
                        key={`city-${builderKey}`}
                        items={cityItems}
                        initialValue={builderCity}
                        displayLabel="Select city"
                        onSelect={(v) => {
                          setBuilderCity(v);
                          setBuilderLeg("");
                        }}
                        ariaLabel="City or town"
                      />
                    </div>
                    {builderCity && (
                      <div className="space-y-1">
                        <Label>Leg district (optional)</Label>
                        <ComboboxDropdown
                          key={`leg-${builderKey}`}
                          items={[
                            { value: "", label: "All districts" },
                            ...legDistrictOptions,
                          ]}
                          initialValue={builderLeg}
                          displayLabel="Select district"
                          onSelect={(v) => setBuilderLeg(v)}
                          ariaLabel="Legislative district"
                        />
                      </div>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      disabled={!builderCity || builderDuplicate}
                      onClick={addJurisdiction}
                    >
                      Add
                    </Button>
                  </div>

                  {builderDuplicate && (
                    <p className="text-sm text-amber-600">
                      This jurisdiction is already added.
                    </p>
                  )}

                  {formData.jurisdictions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No jurisdictions added yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {formData.jurisdictions.map((j, index) => (
                        <div
                          key={`${j.termId}-${j.cityTown}-${j.legDistrict ?? "all"}`}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <span className="text-sm">
                            {jurisdictionLabel(j.cityTown, j.legDistrict)}
                            <span className="text-muted-foreground">
                              {" "}
                              — {j.termLabel}
                            </span>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeJurisdiction(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="customMessage">Custom Message (Optional)</Label>
            <Textarea
              id="customMessage"
              placeholder="Welcome message for the new user..."
              value={formData.customMessage}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  customMessage: e.target.value,
                }))
              }
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiresInDays">Expires In (Days)</Label>
            <Select
              value={formData.expiresInDays?.toString()}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  expiresInDays: parseInt(value),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select expiration period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="15">15 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Button
              onClick={createInvite}
              disabled={
                createInviteMutation.loading ||
                !!emailError ||
                !formData.email.trim() ||
                leaderDisabledForCreate
              }
              aria-describedby={
                createDisabledReason
                  ? "create-invite-disabled-reason"
                  : undefined
              }
            >
              {createInviteMutation.loading ? "Creating..." : "Create Invite"}
            </Button>
            {createDisabledReason && (
              <p
                id="create-invite-disabled-reason"
                className="text-sm text-muted-foreground"
              >
                {createDisabledReason}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invites List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {loading ? "Invites" : `Invites (${invites.length})`}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            You can send invitees the invite URL, or they can login directly
            with a matching email address.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : invites.length === 0 ? (
            <p className="text-muted-foreground">No invites found</p>
          ) : (
            <div className="space-y-4">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{invite.email}</span>
                      <Badge
                        className={getPrivilegeColor(invite.privilegeLevel)}
                        hoverable={false}
                      >
                        {invite.privilegeLevel}
                      </Badge>
                      {invite.usedAt ? (
                        <Badge variant="secondary" hoverable={false}>
                          Used
                        </Badge>
                      ) : new Date(invite.expiresAt) < new Date() ? (
                        <Badge variant="destructive" hoverable={false}>
                          Expired
                        </Badge>
                      ) : (
                        <Badge variant="outline" hoverable={false}>
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <CopyButton
                        onClick={() => copyInviteUrl(invite)}
                        title="Copy invite URL"
                      />
                      <DeleteButton
                        disabled={deleteInviteMutation.loading}
                        onClick={() => deleteInvite(invite.id, invite.email)}
                        title="Delete invite"
                      />
                    </div>
                  </div>

                  {invite.jurisdictions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {invite.jurisdictions.map((j) => (
                        <Badge key={j.id} variant="outline" hoverable={false}>
                          {jurisdictionLabel(j.cityTown, j.legDistrict)} —{" "}
                          {j.term.label}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {invite.customMessage && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Message for user:</strong> {invite.customMessage}
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {invite.usedAt
                          ? `Used: ${formatInviteDate(invite.usedAt, { month: "short" })}`
                          : `Expires: ${formatInviteDate(invite.expiresAt, { month: "short" })}`}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>
                        Created:{" "}
                        {formatInviteDate(invite.createdAt, { month: "short" })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
