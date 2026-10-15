"use client";
/**
 * The LTED total-weight editor (Admin). Saves through the existing
 * `PATCH /api/committee/updateLtedWeight`, which also recomputes every seat's
 * weight (LTED total ÷ seats per LTED). Validation and server errors show
 * inline, as text (plan §10).
 *
 * The parent keys this component on the saved value, so the field resets to
 * the server's value whenever the refreshed detail brings a new one.
 */
import React, { useId, useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useApiMutation } from "~/hooks/useApiMutation";
import { parseLtedWeightInput } from "./seatsWeightDisplay";

type UpdateLtedWeightPayload = { committeeListId: number; ltedWeight: number | null };

export type LtedWeightEditorProps = {
  committeeListId: number;
  /** `committee.ltedWeight` as the server sent it (Decimal string), null when unset. */
  ltedWeight: string | null;
  maxSeatsPerLted: number;
  /** Called after the server saved the value. */
  onSaved: (value: number | null) => void;
};

export function LtedWeightEditor({
  committeeListId,
  ltedWeight,
  maxSeatsPerLted,
  onSaved,
}: LtedWeightEditorProps) {
  const ids = useId();
  const inputId = `${ids}-input`;
  const hintId = `${ids}-hint`;
  const errorId = `${ids}-error`;
  const saved = ltedWeight ?? "";
  const [draft, setDraft] = useState(saved);
  const [error, setError] = useState<string | null>(null);

  const mutation = useApiMutation<{ success: boolean }, UpdateLtedWeightPayload>(
    "/api/committee/updateLtedWeight",
    "PATCH",
  );

  // Numerically equal to the saved value ("100.0" vs "100"): nothing to save.
  const current = parseLtedWeightInput(draft);
  const unchanged =
    current.ok &&
    (current.value === null ? saved === "" : saved !== "" && current.value === Number(saved));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseLtedWeightInput(draft);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    try {
      await mutation.mutate({ committeeListId, ltedWeight: parsed.value });
      onSaved(parsed.value);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "Something went wrong.";
      setError(`Could not save LTED weight: ${message}`);
    }
  };

  return (
    <form onSubmit={(e) => void save(e)} className="space-y-2" noValidate>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={inputId}>LTED total weight</Label>
          <Input
            id={inputId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="Not set"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            aria-invalid={error !== null}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            className="w-36"
          />
        </div>
        <Button type="submit" size="sm" disabled={mutation.loading || unchanged}>
          {mutation.loading ? "Saving…" : "Save LTED weight"}
        </Button>
      </div>
      <p id={hintId} className="text-slate-600 dark:text-slate-400">
        Each seat&apos;s weight is this total divided by {maxSeatsPerLted}. Leave
        it blank to clear the weight.
      </p>
      {error && (
        <p id={errorId} role="alert" className="text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
