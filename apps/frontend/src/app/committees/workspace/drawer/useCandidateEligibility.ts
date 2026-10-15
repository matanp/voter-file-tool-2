"use client";
/**
 * The selected candidate's eligibility preflight (SRS §2.2). Server-decided:
 * the drawer renders the hard stops and warnings it returns and never
 * re-derives them. A new candidate aborts the previous check; `retry`
 * re-runs the current one.
 */
import { useCallback, useEffect, useState } from "react";

import type { EligibilityPreflightResponse } from "~/lib/eligibilityPreflight";
import { fetchCandidateEligibility } from "../adapters";
import type { CommitteeRef } from "../committeeAction";

export type CandidateEligibility =
  | { status: "loading" }
  | { status: "ready"; preflight: EligibilityPreflightResponse }
  | { status: "error"; error: string };

export function useCandidateEligibility(
  committee: CommitteeRef,
  voterRecordId: string | null,
): CandidateEligibility & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CandidateEligibility>({ status: "loading" });

  useEffect(() => {
    if (voterRecordId === null) return;
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchCandidateEligibility(committee, voterRecordId, controller.signal).then(
      (preflight) => {
        if (!controller.signal.aborted) setState({ status: "ready", preflight });
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          error: err instanceof Error ? err.message : "Failed to check eligibility",
        });
      },
    );
    return () => controller.abort();
  }, [committee, voterRecordId, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { ...state, retry };
}
