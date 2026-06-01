"use client";

import * as React from "react";
import { useState, useMemo, useContext } from "react";
import Link from "next/link";
import { PrivilegeLevel, type CommitteeList } from "@prisma/client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useToast } from "~/components/ui/use-toast";
import { ComboboxDropdown } from "~/components/ui/ComboBox";
import { ReportStatusTracker } from "~/app/components/ReportStatusTracker";
import { useApiMutation } from "~/hooks/useApiMutation";
import { hasPermissionFor } from "~/lib/utils";
import { GlobalContext } from "~/components/providers/GlobalContext";
import type { GenerateReportData } from "@voter-file-tool/shared-validators";

interface WeightSummaryFormProps {
  committeeLists: CommitteeList[];
  userPrivilegeLevel: PrivilegeLevel;
}

type Scope = "jurisdiction" | "countywide";
type Format = "pdf" | "xlsx";

function formatTodayDate(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function WeightSummaryForm({
  committeeLists,
  userPrivilegeLevel,
}: WeightSummaryFormProps) {
  const { toast } = useToast();
  const { actingPermissions } = useContext(GlobalContext);

  const effectivePrivilege = actingPermissions ?? userPrivilegeLevel;
  const isAdmin = hasPermissionFor(effectivePrivilege, PrivilegeLevel.Admin);
  const isLeaderOnly = !isAdmin;

  const [name, setName] = useState(`Weight Summary - ${formatTodayDate()}`);
  const [format, setFormat] = useState<Format>("xlsx");
  const [scope, setScope] = useState<Scope>(
    isLeaderOnly ? "jurisdiction" : "countywide",
  );
  const [cityTown, setCityTown] = useState("");
  const [legDistrict, setLegDistrict] = useState<number | undefined>(undefined);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const cities = useMemo(() => {
    const set = new Set(committeeLists.map((c) => c.cityTown));
    return Array.from(set).sort();
  }, [committeeLists]);

  const legDistricts = useMemo(() => {
    if (!cityTown) return [];
    return Array.from(
      new Set(
        committeeLists
          .filter((c) => c.cityTown === cityTown)
          .map((c) => c.legDistrict),
      ),
    ).sort((a, b) => a - b);
  }, [committeeLists, cityTown]);

  const showLegDistrict =
    cityTown.toUpperCase() === "ROCHESTER" && legDistricts.length > 1;

  const generateReportMutation = useApiMutation<
    { reportId: string },
    GenerateReportData
  >("/api/generateReport", "POST", {
    onSuccess: (data) => {
      setReportId(data.reportId);
      toast({
        title: "Report Generation Started",
        description:
          "Your designation weight summary is being generated. You'll be notified when it's ready.",
      });
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error",
        description: `Failed to generate report: ${msg}`,
        variant: "destructive",
      });
    },
  });

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Report name is required";
    }
    if (scope === "jurisdiction" && !cityTown) {
      newErrors.cityTown =
        "City/Town selection is required for jurisdiction scope";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleCityChange = (value: string) => {
    setCityTown(value);
    setLegDistrict(undefined);
    if (value && errors.cityTown) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.cityTown;
        return next;
      });
    }
  };

  const handleLegDistrictChange = (value: string) => {
    setLegDistrict(value ? Number(value) : undefined);
  };

  const handleReportComplete = (url: string) => {
    toast({
      description: "Designation weight summary generated successfully!",
      duration: 5000,
    });
    setReportUrl(url);
    setReportId(null);
  };

  const handleReportError = (errorMessage: string) => {
    toast({
      variant: "destructive",
      title: "Generation Failed",
      description:
        errorMessage || "Failed to generate designation weight summary",
      duration: 5000,
    });
    setReportId(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setHasSubmitted(true);

    if (!validate()) return;

    setReportUrl(null);

    const payload: GenerateReportData = {
      type: "designationWeightSummary",
      name: name.trim(),
      format,
      scope,
      ...(scope === "jurisdiction" && cityTown ? { cityTown } : {}),
      ...(scope === "jurisdiction" && legDistrict !== undefined
        ? { legDistrict }
        : {}),
    };

    await generateReportMutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="reportName">Report Name</Label>
        <Input
          id="reportName"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim() && errors.name) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.name;
                return next;
              });
            }
          }}
          placeholder="Enter report name"
        />
        {hasSubmitted && errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Format</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="xlsx"
              checked={format === "xlsx"}
              onChange={() => setFormat("xlsx")}
              className="accent-primary"
            />
            <span className="text-sm">XLSX</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="pdf"
              checked={format === "pdf"}
              onChange={() => setFormat("pdf")}
              className="accent-primary"
            />
            <span className="text-sm">PDF</span>
          </label>
        </div>
      </div>

      {!isLeaderOnly && (
        <div className="space-y-2">
          <Label>Scope</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="countywide"
                checked={scope === "countywide"}
                onChange={() => {
                  setScope("countywide");
                  setCityTown("");
                  setLegDistrict(undefined);
                }}
                className="accent-primary"
              />
              <span className="text-sm">Countywide</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="jurisdiction"
                checked={scope === "jurisdiction"}
                onChange={() => setScope("jurisdiction")}
                className="accent-primary"
              />
              <span className="text-sm">By Jurisdiction</span>
            </label>
          </div>
        </div>
      )}

      {(scope === "jurisdiction" || isLeaderOnly) && (
        <div className="space-y-2">
          <Label>City/Town</Label>
          <ComboboxDropdown
            items={cities.map((c) => ({ label: c, value: c }))}
            initialValue={cityTown}
            displayLabel="Select City/Town"
            onSelect={handleCityChange}
          />
          {hasSubmitted && errors.cityTown && (
            <p className="text-sm text-destructive">{errors.cityTown}</p>
          )}
        </div>
      )}

      {showLegDistrict && (
        <div className="space-y-2">
          <Label>Legislative District</Label>
          <ComboboxDropdown
            items={legDistricts.map((d) => ({
              label: String(d),
              value: String(d),
            }))}
            initialValue={legDistrict !== undefined ? String(legDistrict) : ""}
            displayLabel="Select Legislative District"
            onSelect={handleLegDistrictChange}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={
            generateReportMutation.loading ||
            (hasSubmitted && Object.keys(errors).length > 0)
          }
        >
          {generateReportMutation.loading ? "Generating..." : "Generate Report"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Find your report in the{" "}
          <Link
            href="/reports"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Reports page
          </Link>
        </p>
      </div>

      {generateReportMutation.loading && (
        <div className="bg-primary-foreground p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            <span>Generating designation weight summary...</span>
          </div>
        </div>
      )}

      {reportId && (
        <ReportStatusTracker
          reportId={reportId}
          onComplete={handleReportComplete}
          onError={handleReportError}
        />
      )}

      {reportUrl && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 py-2">
            <p className="font-medium">
              Designation weight summary generated successfully!
            </p>
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              Open in New Tab
            </a>
          </div>
        </div>
      )}
    </form>
  );
}
