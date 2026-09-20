"use client";
/**
 * PROTOTYPE — read-only add-member drawer (plan §8 four-step flow) so we can
 * judge whether the drawer keeps enough committee context. Every mutation is
 * stubbed to a toast.
 */
import React, { useState } from "react";
import { PrivilegeLevel } from "@prisma/client";
import { AlertTriangle, Check, ChevronLeft, Search, XCircle } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { hasPermissionFor } from "~/lib/utils";
import { useToast } from "~/components/ui/use-toast";
import type { EdRollup } from "~/lib/validations/committee";
import { capitalize, mockCandidates } from "./mockData";

export type PrototypeAction = {
  kind: "add-member";
  committee: EdRollup;
  seatNumber?: number;
  /** replace-member is add with a preselected target (plan §8) */
  replacingName?: string;
} | null;

type Candidate = ReturnType<typeof mockCandidates>[number];

const STEPS = ["Find", "Review", "Details", "Confirm"] as const;

export function AddMemberDrawerStub({
  action,
  role,
  onClose,
}: {
  action: PrototypeAction;
  role: PrivilegeLevel;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [onlyEligible, setOnlyEligible] = useState(true);
  const [type, setType] = useState<"APPOINTED" | "PETITIONED">("APPOINTED");

  const reset = () => {
    setStep(0);
    setQuery("");
    setCandidate(null);
  };

  const isAdmin = hasPermissionFor(role, PrivilegeLevel.Admin);
  const primaryLabel = isAdmin ? "Add member" : "Submit candidate";
  const c = action?.committee;
  const vacant = c ? c.totalSeats - c.filled : 0;
  const results = mockCandidates(query).filter((r) => !onlyEligible || r.eligible);

  return (
    <Sheet
      open={action !== null}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          reset();
        }
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
      >
        {c && (
          <>
            {/* Persistent committee context — the thing we're evaluating */}
            <SheetHeader className="border-b bg-slate-50 px-5 py-4 text-left dark:bg-slate-900">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {action?.replacingName ? "Replacing member in" : "Adding to"}
              </div>
              <SheetTitle className="text-base">
                {capitalize(c.cityTown)} · LD {c.legDistrict} · ED {c.electionDistrict}
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                <span>
                  {c.filled} of {c.totalSeats} seats filled
                </span>
                {action?.seatNumber && <Badge variant="outline">Seat {action.seatNumber}</Badge>}
                {action?.replacingName && (
                  <Badge variant="secondary">Replacing {action.replacingName}</Badge>
                )}
                {vacant === 0 && !action?.replacingName && (
                  <Badge variant="destructive">No open seats — will be unassigned</Badge>
                )}
                {c.pendingCount > 0 && (
                  <Badge variant="outline">{c.pendingCount} already pending</Badge>
                )}
              </SheetDescription>
              <ol className="mt-2 flex gap-1 text-xs">
                {STEPS.map((s, i) => (
                  <li
                    key={s}
                    className={`rounded-full px-2 py-0.5 ${
                      i === step
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : i < step
                          ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                          : "text-slate-400"
                    }`}
                  >
                    {i + 1}. {s}
                  </li>
                ))}
              </ol>
            </SheetHeader>

            <div className="flex-1 space-y-4 px-5 py-4">
              {step === 0 && (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                      <Label>Voter ID</Label>
                      <Input placeholder="VRCNUM" />
                    </div>
                    <div>
                      <Label>First name</Label>
                      <Input placeholder="First" />
                    </div>
                    <div>
                      <Label>Last name</Label>
                      <Input
                        placeholder="Last"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={onlyEligible}
                      onChange={(e) => setOnlyEligible(e.target.checked)}
                    />
                    Only eligible candidates
                  </label>
                  <div className="rounded-md border">
                    {results.length === 0 ? (
                      <div className="flex items-center gap-2 p-4 text-sm text-slate-500">
                        <Search className="h-4 w-4" /> Type a last name to search (stubbed)
                      </div>
                    ) : (
                      <ul className="divide-y">
                        {results.map((r) => (
                          <li key={r.VRCNUM}>
                            <button
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                              onClick={() => {
                                setCandidate(r);
                                setStep(1);
                              }}
                            >
                              <span>
                                <span className="font-medium">
                                  {r.firstName} {r.lastName}
                                </span>
                                <span className="ml-2 text-slate-500">{r.address}</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-1">
                                {!r.inDistrict && <Badge variant="outline">Out of ED</Badge>}
                                {!r.eligible && <Badge variant="destructive">Ineligible</Badge>}
                                <span className="font-mono text-xs text-slate-400">{r.VRCNUM}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}

              {step === 1 && candidate && (
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-lg font-semibold">
                      {candidate.firstName} {candidate.lastName}
                    </div>
                    <div className="text-slate-500">
                      {candidate.address} · {candidate.party} · {candidate.VRCNUM}
                    </div>
                  </div>
                  {candidate.hardStop && (
                    <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-medium">Cannot be added</div>
                        {candidate.hardStop}
                      </div>
                    </div>
                  )}
                  {candidate.warning && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-medium">Warning</div>
                        {candidate.warning} — {isAdmin ? "override reason required" : "Admin will review"}
                      </div>
                    </div>
                  )}
                  {!candidate.inDistrict && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      Registered outside ED {c.electionDistrict}.
                    </div>
                  )}
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md bg-slate-50 p-3 dark:bg-slate-900">
                    <dt className="text-slate-500">Existing membership</dt>
                    <dd>None this term</dd>
                    <dt className="text-slate-500">Committee capacity</dt>
                    <dd>
                      {vacant} open of {c.totalSeats}
                    </dd>
                  </dl>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <div>
                    <Label>Membership type</Label>
                    <div className="mt-1 flex gap-2">
                      {(["APPOINTED", "PETITIONED"] as const).map((t) => (
                        <Button
                          key={t}
                          size="sm"
                          variant={type === t ? "default" : "outline"}
                          onClick={() => setType(t)}
                        >
                          {t === "APPOINTED" ? "Appointed" : "Petitioned"}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Email</Label>
                      <Input placeholder="optional" />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input placeholder="optional" />
                    </div>
                  </div>
                  {candidate?.warning && isAdmin && (
                    <div>
                      <Label>Override reason</Label>
                      <Input placeholder="Required because of the warning above" />
                    </div>
                  )}
                  {!isAdmin && (
                    <div>
                      <Label>Notes for the reviewer</Label>
                      <Input placeholder="optional" />
                    </div>
                  )}
                </div>
              )}

              {step === 3 && candidate && (
                <div className="space-y-3 text-sm">
                  <div className="rounded-md border p-3">
                    <div className="text-xs uppercase text-slate-500">Destination</div>
                    <div className="font-medium">
                      {capitalize(c.cityTown)} · LD {c.legDistrict} · ED {c.electionDistrict}
                      {action?.seatNumber ? ` · Seat ${action.seatNumber}` : " · next open seat"}
                    </div>
                    {action?.replacingName && <div>Replacing {action.replacingName}</div>}
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs uppercase text-slate-500">Candidate</div>
                    <div className="font-medium">
                      {candidate.firstName} {candidate.lastName}
                    </div>
                    <div className="text-slate-500">
                      {type === "APPOINTED" ? "Appointed" : "Petitioned"} · {candidate.VRCNUM}
                    </div>
                  </div>
                  {!isAdmin && (
                    <p className="text-slate-500">
                      This creates a pending submission for Admin review; it does not seat the member.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
              <Button
                variant="ghost"
                size="sm"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              {step < 3 ? (
                <Button
                  size="sm"
                  disabled={step === 0 || (step === 1 && !!candidate?.hardStop)}
                  onClick={() => setStep((s) => s + 1)}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    toast({
                      title: `${primaryLabel} (stubbed)`,
                      description: `Prototype: no request was sent for ${candidate?.firstName} ${candidate?.lastName}.`,
                    });
                    onClose();
                    reset();
                  }}
                >
                  <Check className="mr-1 h-4 w-4" /> {primaryLabel}
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
