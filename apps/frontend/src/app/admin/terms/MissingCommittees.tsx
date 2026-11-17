"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useToast } from "~/components/ui/use-toast";
import { useApiMutation } from "~/hooks/useApiMutation";
import { useApiQuery } from "~/hooks/useApiQuery";
import type { MissingCommittee } from "~/lib/committees/missingCommittees";

type MissingCommitteesResponse = {
  termId: string;
  termLabel: string;
  missing: MissingCommittee[];
  unknownTownCodes: string[];
};

type CreateMissingCommitteesResponse = {
  success: boolean;
  committeesCreated: number;
  seatsCreated: number;
};

// The preview groups the whole voter file; creating writes a few hundred rows.
const CREATE_TIMEOUT_MS = 60_000;

function groupByTown(missing: MissingCommittee[]): Array<[string, MissingCommittee[]]> {
  const groups = new Map<string, MissingCommittee[]>();
  for (const committee of missing) {
    const list = groups.get(committee.cityTown) ?? [];
    list.push(committee);
    groups.set(committee.cityTown, list);
  }
  return Array.from(groups.entries());
}

/**
 * Lists voter-file EDs with no committee in the active term and creates them,
 * so vacant EDs show up in the committee menus and can be filled.
 */
export function MissingCommittees() {
  const { toast } = useToast();
  const query = useApiQuery<MissingCommitteesResponse>(
    "/api/admin/committees/missing",
    { timeout: CREATE_TIMEOUT_MS },
  );

  const createMutation = useApiMutation<CreateMissingCommitteesResponse, never>(
    "/api/admin/committees/missing",
    "POST",
    {
      timeout: CREATE_TIMEOUT_MS,
      onSuccess: (data) => {
        toast({
          title: "Committees created",
          description: `Created ${data.committeesCreated} committees with ${data.seatsCreated} seats.`,
        });
        void query.refetch();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    },
  );

  const data = query.data;
  const missing = data?.missing ?? [];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Missing committees</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          A committee only appears in the committee menus once it exists for the
          term. This finds every election district in the voter file that has no
          committee in the active term yet, and creates it with empty seats so it
          can be filled. Re-import the Weighted Table afterwards to give the new
          committees their weights.
        </p>

        {query.loading && !data && (
          <p className="text-sm">Checking the voter file…</p>
        )}
        {query.error && (
          <p className="text-sm text-destructive">{query.error}</p>
        )}

        {data && (
          <>
            <p className="text-sm">
              {missing.length === 0 ? (
                <>
                  Every election district in the voter file has a committee in{" "}
                  <strong>{data.termLabel}</strong>.
                </>
              ) : (
                <>
                  <strong>{missing.length}</strong> election{" "}
                  {missing.length === 1 ? "district has" : "districts have"} no
                  committee in <strong>{data.termLabel}</strong>.
                </>
              )}
            </p>

            {data.unknownTownCodes.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Skipped voter-file town codes that aren&apos;t Monroe towns:{" "}
                {data.unknownTownCodes.join(", ")}.
              </p>
            )}

            {missing.length > 0 && (
              <>
                <details className="text-sm">
                  <summary className="cursor-pointer">
                    Show the election districts
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {groupByTown(missing).map(([town, committees]) => (
                      <li key={town}>
                        <span className="font-medium">{town}</span> (
                        {committees.length}):{" "}
                        {committees
                          .map(
                            (c) =>
                              `LD ${c.legDistrict} ED ${c.electionDistrict}`,
                          )
                          .join(", ")}
                      </li>
                    ))}
                  </ul>
                </details>
                <Button
                  onClick={() => void createMutation.mutate()}
                  disabled={createMutation.loading}
                >
                  {createMutation.loading
                    ? "Creating…"
                    : `Create ${missing.length} committees`}
                </Button>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
