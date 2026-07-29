"use client";

import { type IneligibilityReason } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useToast } from "~/components/ui/use-toast";
import { useApiQuery } from "~/hooks/useApiQuery";

type GovernanceConfigApiPayload = {
  requiredPartyCode: string;
  maxSeatsPerLted: number;
  requireAssemblyDistrictMatch: boolean;
  nonOverridableIneligibilityReasons: IneligibilityReason[];
  updatedAt: string;
};

type GovernanceConfigResponse = {
  config: GovernanceConfigApiPayload;
  partyOptions: string[];
  guardrails: {
    minMaxSeatsPerLted: number;
    maxMaxSeatsPerLted: number;
  };
};

type GovernanceConfigUpdatePayload = Omit<GovernanceConfigApiPayload, "updatedAt">;

type FieldErrors = Partial<Record<keyof GovernanceConfigUpdatePayload, string[]>>;

type ValidationFailureBody = {
  error?: string;
  fieldErrors?: FieldErrors;
};

const INELIGIBILITY_REASON_LABELS: Record<IneligibilityReason, string> = {
  NOT_REGISTERED: "Not registered",
  PARTY_MISMATCH: "Party mismatch",
  ASSEMBLY_DISTRICT_MISMATCH: "Assembly district mismatch",
  CAPACITY: "Capacity reached",
  ALREADY_IN_ANOTHER_COMMITTEE: "Already in another committee",
};

function normalizeReasons(reasons: IneligibilityReason[]): IneligibilityReason[] {
  return [...reasons].sort();
}

function sameReasons(
  left: IneligibilityReason[],
  right: IneligibilityReason[],
): boolean {
  const a = normalizeReasons(left);
  const b = normalizeReasons(right);
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function buildDiff(
  original: GovernanceConfigApiPayload,
  draft: GovernanceConfigUpdatePayload,
): string[] {
  const diff: string[] = [];

  if (original.requiredPartyCode !== draft.requiredPartyCode) {
    diff.push(
      `Required party: ${original.requiredPartyCode} -> ${draft.requiredPartyCode}`,
    );
  }
  if (original.maxSeatsPerLted !== draft.maxSeatsPerLted) {
    diff.push(
      `Max seats per LTED: ${String(original.maxSeatsPerLted)} -> ${String(draft.maxSeatsPerLted)}`,
    );
  }
  if (
    original.requireAssemblyDistrictMatch !==
    draft.requireAssemblyDistrictMatch
  ) {
    diff.push(
      `Assembly district match check: ${original.requireAssemblyDistrictMatch ? "Enabled" : "Disabled"} -> ${draft.requireAssemblyDistrictMatch ? "Enabled" : "Disabled"}`,
    );
  }
  if (
    !sameReasons(
      original.nonOverridableIneligibilityReasons,
      draft.nonOverridableIneligibilityReasons,
    )
  ) {
    const before = normalizeReasons(
      original.nonOverridableIneligibilityReasons,
    ).join(", ");
    const after = normalizeReasons(
      draft.nonOverridableIneligibilityReasons,
    ).join(", ");
    diff.push(
      `Non-overridable reasons: ${before || "(none)"} -> ${after || "(none)"}`,
    );
  }

  return diff;
}

export function GovernanceConfigClient() {
  const { toast } = useToast();
  const [draft, setDraft] = useState<GovernanceConfigUpdatePayload | null>(null);
  const [original, setOriginal] = useState<GovernanceConfigApiPayload | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const query = useApiQuery<GovernanceConfigResponse>("/api/admin/governance-config");

  useEffect(() => {
    if (!query.data) return;
    setOriginal(query.data.config);
    setDraft({
      requiredPartyCode: query.data.config.requiredPartyCode,
      maxSeatsPerLted: query.data.config.maxSeatsPerLted,
      requireAssemblyDistrictMatch: query.data.config.requireAssemblyDistrictMatch,
      nonOverridableIneligibilityReasons: [
        ...query.data.config.nonOverridableIneligibilityReasons,
      ],
    });
    setFieldErrors({});
    setSaveError(null);
    setShowConfirm(false);
  }, [query.data]);

  const pendingDiff = useMemo(() => {
    if (!original || !draft) return [];
    return buildDiff(original, draft);
  }, [draft, original]);

  const updateReason = (reason: IneligibilityReason, checked: boolean) => {
    if (!draft) return;
    if (checked) {
      const next = new Set(draft.nonOverridableIneligibilityReasons);
      next.add(reason);
      setDraft({
        ...draft,
        nonOverridableIneligibilityReasons: [...next],
      });
      return;
    }
    setDraft({
      ...draft,
      nonOverridableIneligibilityReasons:
        draft.nonOverridableIneligibilityReasons.filter((value) => value !== reason),
    });
  };

  const onSubmit = async () => {
    if (!draft) return;
    setSaving(true);
    setFieldErrors({});
    setSaveError(null);

    try {
      const response = await fetch("/api/admin/governance-config", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(draft),
      });
      const body = (await response.json()) as
        | GovernanceConfigResponse
        | ValidationFailureBody;

      if (!response.ok) {
        if (response.status === 422) {
          const validationBody = body as ValidationFailureBody;
          setFieldErrors(validationBody.fieldErrors ?? {});
          setSaveError(validationBody.error ?? "Validation failed");
          return;
        }
        throw new Error(
          (body as ValidationFailureBody).error ??
            `Save failed with status ${String(response.status)}`,
        );
      }

      const successBody = body as GovernanceConfigResponse;
      setOriginal(successBody.config);
      setDraft({
        requiredPartyCode: successBody.config.requiredPartyCode,
        maxSeatsPerLted: successBody.config.maxSeatsPerLted,
        requireAssemblyDistrictMatch: successBody.config.requireAssemblyDistrictMatch,
        nonOverridableIneligibilityReasons: [
          ...successBody.config.nonOverridableIneligibilityReasons,
        ],
      });
      setShowConfirm(false);
      toast({ title: "Governance config saved" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save config";
      setSaveError(message);
      toast({
        title: "Save failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Committee Governance Rules</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {query.error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{query.error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.refetch()}
                disabled={query.loading}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!draft || !query.data ? (
          <p className="text-sm text-muted-foreground">
            {query.loading ? "Loading governance config..." : "No governance config found."}
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="requiredPartyCode">Required party code</Label>
              <select
                id="requiredPartyCode"
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={draft.requiredPartyCode}
                onChange={(event) => {
                  setDraft({
                    ...draft,
                    requiredPartyCode: event.target.value,
                  });
                }}
              >
                {query.data.partyOptions.map((partyCode) => (
                  <option key={partyCode} value={partyCode}>
                    {partyCode}
                  </option>
                ))}
              </select>
              {fieldErrors.requiredPartyCode?.map((message) => (
                <p
                  key={message}
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {message}
                </p>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxSeatsPerLted">
                Max seats per LTED ({String(query.data.guardrails.minMaxSeatsPerLted)}-
                {String(query.data.guardrails.maxMaxSeatsPerLted)})
              </Label>
              <Input
                id="maxSeatsPerLted"
                type="number"
                min={query.data.guardrails.minMaxSeatsPerLted}
                max={query.data.guardrails.maxMaxSeatsPerLted}
                value={draft.maxSeatsPerLted}
                onChange={(event) => {
                  setDraft({
                    ...draft,
                    maxSeatsPerLted: Number(event.target.value),
                  });
                }}
              />
              {fieldErrors.maxSeatsPerLted?.map((message) => (
                <p
                  key={message}
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {message}
                </p>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  id="requireAssemblyDistrictMatch"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={draft.requireAssemblyDistrictMatch}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      requireAssemblyDistrictMatch: event.target.checked,
                    })
                  }
                />
                <Label htmlFor="requireAssemblyDistrictMatch">
                  Require Assembly District match
                </Label>
              </div>
              {fieldErrors.requireAssemblyDistrictMatch?.map((message) => (
                <p
                  key={message}
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {message}
                </p>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Non-overridable ineligibility reasons</Label>
              <div className="space-y-2">
                {Object.entries(INELIGIBILITY_REASON_LABELS).map(
                  ([reason, label]) => (
                    <div key={reason} className="flex items-center gap-2">
                      <input
                        id={`reason-${reason}`}
                        type="checkbox"
                        className="h-4 w-4"
                        checked={draft.nonOverridableIneligibilityReasons.includes(
                          reason as IneligibilityReason,
                        )}
                        onChange={(event) =>
                          updateReason(
                            reason as IneligibilityReason,
                            event.target.checked,
                          )
                        }
                      />
                      <Label htmlFor={`reason-${reason}`}>{label}</Label>
                    </div>
                  ),
                )}
              </div>
              {fieldErrors.nonOverridableIneligibilityReasons?.map((message) => (
                <p
                  key={message}
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {message}
                </p>
              ))}
            </div>

            {saveError && (
              <Alert variant="destructive">
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3 border rounded-md p-4">
              <h3 className="text-sm font-semibold">Pending changes</h3>
              {pendingDiff.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending changes.</p>
              ) : (
                <ul className="list-disc pl-5 text-sm">
                  {pendingDiff.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowConfirm(true)}
                  disabled={pendingDiff.length === 0 || saving}
                >
                  Save changes
                </Button>
                {showConfirm && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setShowConfirm(false)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => void onSubmit()}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Confirm save"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
