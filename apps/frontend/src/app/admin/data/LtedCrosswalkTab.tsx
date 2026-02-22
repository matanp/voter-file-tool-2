"use client";

/**
 * SRS 3.7 — LTED Crosswalk admin tab.
 * Import section (Excel upload) + Browse/Edit section (table with CRUD).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useToast } from "~/components/ui/use-toast";
import { useApiMutation } from "~/hooks/useApiMutation";
import { useApiQuery } from "~/hooks/useApiQuery";

type LtedDistrictCrosswalk = {
  id: string;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  stateAssemblyDistrict: string;
  stateSenateDistrict: string | null;
  congressionalDistrict: string | null;
  countyLegDistrict: string | null;
};

type CrosswalkListResponse = {
  data: LtedDistrictCrosswalk[];
  total: number;
  page: number;
  pageSize: number;
  lastImported: string | null;
  requireAssemblyDistrictMatch: boolean;
  cityTowns: string[];
};

type ImportSummary = {
  rowsProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

const PAGE_SIZE = 25;

function buildQuery(page: number, cityTown?: string, legDistrict?: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(PAGE_SIZE));
  if (cityTown?.trim()) params.set("cityTown", cityTown.trim());
  if (legDistrict !== undefined && legDistrict !== null && !Number.isNaN(legDistrict))
    params.set("legDistrict", String(legDistrict));
  return `/api/admin/crosswalk?${params.toString()}`;
}

export const LtedCrosswalkTab = () => {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [cityTownFilter, setCityTownFilter] = useState<string>("");
  const [legDistrictFilter, setLegDistrictFilter] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);
  const [editRecord, setEditRecord] = useState<LtedDistrictCrosswalk | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LtedDistrictCrosswalk | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const query = buildQuery(
    page,
    cityTownFilter || undefined,
    legDistrictFilter ? parseInt(legDistrictFilter, 10) : undefined,
  );

  const listQuery = useApiQuery<CrosswalkListResponse>(query, {
    enabled: true,
  });

  const importMutation = useApiMutation<{ success: boolean; summary: ImportSummary }, FormData>(
    "/api/admin/crosswalk/import",
    "POST",
    {
      onSuccess: (data) => {
        setImportResult(data.summary);
        setFile(null);
        formRef.current?.reset();
        void listQuery.refetch(query);
        toast({ title: "Import completed" });
      },
      onError: (error) => {
        toast({
          title: "Import failed",
          description: error.message,
          variant: "destructive",
        });
      },
    },
  );

  const upsertMutation = useApiMutation<LtedDistrictCrosswalk, unknown>(
    "/api/admin/crosswalk",
    "POST",
    {
      onSuccess: () => {
        setEditRecord(null);
        setAddModalOpen(false);
        void listQuery.refetch(query);
        toast({ title: "Saved" });
      },
      onError: (error) => {
        toast({
          title: "Save failed",
          description: error.message,
          variant: "destructive",
        });
      },
    },
  );

  const deleteMutation = useApiMutation<{ success: boolean }, void>(
    "/api/admin/crosswalk",
    "DELETE",
    {
      onSuccess: () => {
        setDeleteTarget(null);
        void listQuery.refetch(query);
        toast({ title: "Deleted" });
      },
      onError: (error) => {
        toast({
          title: "Delete failed",
          description: error.message,
          variant: "destructive",
        });
      },
    },
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setImportResult(null);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: "No file selected",
        variant: "destructive",
      });
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast({
        title: "Invalid file type",
        description: "Please select an .xlsx file",
        variant: "destructive",
      });
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    await importMutation.mutate(formData);
  };

  const handleDeleteClick = (record: LtedDistrictCrosswalk) => {
    setDeleteTarget(record);
  };

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    void deleteMutation.mutate(undefined, `/api/admin/crosswalk/${deleteTarget.id}`);
  }, [deleteTarget, deleteMutation]);

  const handleFilterApply = () => {
    setPage(1);
    void listQuery.refetch(buildQuery(1, cityTownFilter || undefined, legDistrictFilter ? parseInt(legDistrictFilter, 10) : undefined));
  };

  // Refetch only when page changes; filters apply on Filter click (handleFilterApply).
  useEffect(() => {
    void listQuery.refetch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- query intentionally omitted; we refetch on page change only
  }, [page]);

  const data = listQuery.data;
  const records = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const lastImported = data?.lastImported;
  const requireAssemblyDistrictMatch = data?.requireAssemblyDistrictMatch ?? true;
  const cityTowns = data?.cityTowns ?? [];

  return (
    <div className="space-y-6">
      <Alert className="border-muted">
        <AlertDescription>
          <p className="font-medium">LTED Crosswalk</p>
          <p className="text-sm mt-1">
            The LTED Crosswalk maps committee jurisdictions (City/Town, Leg District, Election
            District) to state legislative districts. This data is used for assembly district
            eligibility validation.
          </p>
          <p className="text-sm mt-1">
            Upload the LTED Matrix Excel file from MCDC when updated (typically at the start of
            each new term). Update if redistricting occurs mid-term. Use manual entry for
            individual corrections between full imports.
          </p>
        </AlertDescription>
      </Alert>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import LTED Matrix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastImported != null && (
            <p className="text-sm text-muted-foreground">
              Last imported: {new Date(lastImported).toLocaleString()}
            </p>
          )}
          {lastImported == null && (
            <p className="text-sm text-muted-foreground">Last imported: Never</p>
          )}
          <form ref={formRef} onSubmit={handleImportSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="crosswalk-file">LTED Matrix (Excel)</Label>
              <Input
                id="crosswalk-file"
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                disabled={importMutation.loading}
              />
            </div>
            <Button type="submit" disabled={!file || importMutation.loading}>
              {importMutation.loading ? "Importing..." : "Upload LTED Matrix"}
            </Button>
          </form>
          {importMutation.error != null && (
            <Alert variant="destructive">
              <AlertDescription>{importMutation.error}</AlertDescription>
            </Alert>
          )}
          {importResult != null && (
            <Alert>
              <AlertDescription className="space-y-2">
                <p>
                  {importResult.rowsProcessed} rows processed. Created: {importResult.created},
                  Updated: {importResult.updated}, Skipped: {importResult.skipped}
                </p>
                {importResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      {importResult.errors.length} error(s)
                    </summary>
                    <ul className="mt-1 list-inside text-sm">
                      {importResult.errors.map((e, i) => (
                        <li key={i}>
                          Row {e.row}: {e.message}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Browse/Edit Section */}
      <Card>
        <CardHeader>
          <CardTitle>Crosswalk Entries</CardTitle>
          <div className="flex flex-wrap gap-2 items-center pt-2">
            <Select
              value={cityTownFilter || "all"}
              onValueChange={(v) => setCityTownFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="City/Town" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {cityTowns.map((ct) => (
                  <SelectItem key={ct} value={ct}>
                    {ct}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Leg District"
              className="w-28"
              value={legDistrictFilter}
              onChange={(e) => setLegDistrictFilter(e.target.value)}
              type="number"
              min={0}
            />
            <Button size="sm" variant="secondary" onClick={handleFilterApply}>
              Filter
            </Button>
            <Button size="sm" onClick={() => setAddModalOpen(true)}>
              Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {listQuery.loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : listQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>{listQuery.error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>City/Town</TableHead>
                    <TableHead>Leg District</TableHead>
                    <TableHead>Election District</TableHead>
                    <TableHead>Assembly</TableHead>
                    <TableHead>Senate</TableHead>
                    <TableHead>Congressional</TableHead>
                    <TableHead>County Leg</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.cityTown}</TableCell>
                      <TableCell>{row.legDistrict}</TableCell>
                      <TableCell>{row.electionDistrict}</TableCell>
                      <TableCell>{row.stateAssemblyDistrict}</TableCell>
                      <TableCell>{row.stateSenateDistrict ?? "—"}</TableCell>
                      <TableCell>{row.congressionalDistrict ?? "—"}</TableCell>
                      <TableCell>{row.countyLegDistrict ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditRecord(row)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteClick(row)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editRecord != null && (
        <CrosswalkFormModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSave={(payload) => upsertMutation.mutate(payload)}
          loading={upsertMutation.loading}
        />
      )}

      {/* Add Modal */}
      {addModalOpen && (
        <CrosswalkFormModal
          onClose={() => setAddModalOpen(false)}
          onSave={(payload) => upsertMutation.mutate(payload)}
          loading={upsertMutation.loading}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete crosswalk entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the mapping for {deleteTarget?.cityTown} / Leg {deleteTarget?.legDistrict}{" "}
              / ED {deleteTarget?.electionDistrict}.{" "}
              {requireAssemblyDistrictMatch &&
                "Assembly district eligibility is enabled — deleting may affect eligibility validation."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

type CrosswalkFormPayload = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  stateAssemblyDistrict: string;
  stateSenateDistrict?: string;
  congressionalDistrict?: string;
  countyLegDistrict?: string;
};

function CrosswalkFormModal({
  record,
  onClose,
  onSave,
  loading,
}: {
  record?: LtedDistrictCrosswalk;
  onClose: () => void;
  onSave: (payload: CrosswalkFormPayload) => void;
  loading: boolean;
}) {
  const [cityTown, setCityTown] = useState(record?.cityTown ?? "");
  const [legDistrict, setLegDistrict] = useState(record?.legDistrict?.toString() ?? "");
  const [electionDistrict, setElectionDistrict] = useState(
    record?.electionDistrict?.toString() ?? "",
  );
  const [stateAssemblyDistrict, setStateAssemblyDistrict] = useState(
    record?.stateAssemblyDistrict ?? "",
  );
  const [stateSenateDistrict, setStateSenateDistrict] = useState(
    record?.stateSenateDistrict ?? "",
  );
  const [congressionalDistrict, setCongressionalDistrict] = useState(
    record?.congressionalDistrict ?? "",
  );
  const [countyLegDistrict, setCountyLegDistrict] = useState(
    record?.countyLegDistrict ?? "",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ld = parseInt(legDistrict, 10);
    const ed = parseInt(electionDistrict, 10);
    if (Number.isNaN(ld) || ld < 0 || Number.isNaN(ed) || ed < 0) return;
    if (!cityTown.trim() || !stateAssemblyDistrict.trim()) return;

    onSave({
      cityTown: cityTown.trim().toUpperCase(),
      legDistrict: ld,
      electionDistrict: ed,
      stateAssemblyDistrict: stateAssemblyDistrict.trim(),
      stateSenateDistrict: stateSenateDistrict.trim() || undefined,
      congressionalDistrict: congressionalDistrict.trim() || undefined,
      countyLegDistrict: countyLegDistrict.trim() || undefined,
    });
  };

  const isEdit = record != null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : "Add"} Crosswalk Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="form-cityTown">City/Town</Label>
              <Input
                id="form-cityTown"
                value={cityTown}
                onChange={(e) => setCityTown(e.target.value)}
                disabled={isEdit}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-legDistrict">Leg District</Label>
              <Input
                id="form-legDistrict"
                type="number"
                min={0}
                value={legDistrict}
                onChange={(e) => setLegDistrict(e.target.value)}
                disabled={isEdit}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-electionDistrict">Election District</Label>
              <Input
                id="form-electionDistrict"
                type="number"
                min={0}
                value={electionDistrict}
                onChange={(e) => setElectionDistrict(e.target.value)}
                disabled={isEdit}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-assembly">Assembly District</Label>
              <Input
                id="form-assembly"
                value={stateAssemblyDistrict}
                onChange={(e) => setStateAssemblyDistrict(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-senate">Senate District</Label>
              <Input
                id="form-senate"
                value={stateSenateDistrict}
                onChange={(e) => setStateSenateDistrict(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-congressional">Congressional District</Label>
              <Input
                id="form-congressional"
                value={congressionalDistrict}
                onChange={(e) => setCongressionalDistrict(e.target.value)}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="form-countyLeg">County Leg District</Label>
              <Input
                id="form-countyLeg"
                value={countyLegDistrict}
                onChange={(e) => setCountyLegDistrict(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
