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

interface SignInSheetFormProps {
  committeeLists: CommitteeList[];
  userPrivilegeLevel: PrivilegeLevel;
}

type Scope = "jurisdiction" | "countywide";

function formatTodayDate(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function SignInSheetForm({
  committeeLists,
  userPrivilegeLevel,
}: SignInSheetFormProps) {
  const { toast } = useToast();
  const { actingPermissions } = useContext(GlobalContext);

  const effectivePrivilege = actingPermissions ?? userPrivilegeLevel;
  const isAdmin = hasPermissionFor(effectivePrivilege, PrivilegeLevel.Admin);
  const isLeaderOnly = !isAdmin;

  // Form state
  const [name, setName] = useState(
    `Sign-In Sheet - ${formatTodayDate()}`,
  );
  const [scope, setScope] = useState<Scope>(
    isLeaderOnly ? "jurisdiction" : "countywide",
  );
  const [cityTown, setCityTown] = useState("");
  const [legDistrict, setLegDistrict] = useState<number | undefined>(
    undefined,
  );
  const [meetingDate, setMeetingDate] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Derive city list from committeeLists
  const cities = useMemo(() => {
    const set = new Set(committeeLists.map((c) => c.cityTown));
    return Array.from(set).sort();
  }, [committeeLists]);

  // Derive leg districts for selected city (only for Rochester)
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

  // API mutation
  const generateReportMutation = useApiMutation<
    { reportId: string },
    GenerateReportData
  >("/api/generateReport", "POST", {
    onSuccess: (data) => {
      setReportId(data.reportId);
      toast({
        title: "Report Generation Started",
        description:
          "Your sign-in sheet is being generated. You'll be notified when it's ready.",
      });
    },
    onError: (error) => {
      const msg =
        error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error",
        description: `Failed to generate report: ${msg}`,
        variant: "destructive",
      });
    },
  });

  // Validation
  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Report name is required";
    }
    if (scope === "jurisdiction" && !cityTown) {
      newErrors.cityTown = "City/Town selection is required for jurisdiction scope";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Handlers
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
      description: "Sign-in sheet generated successfully!",
      duration: 5000,
    });
    setReportUrl(url);
    setReportId(null);
  };

  const handleReportError = (errorMessage: string) => {
    toast({
      variant: "destructive",
      title: "Generation Failed",
      description: errorMessage || "Failed to generate sign-in sheet",
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
      type: "signInSheet" as const,
      name: name.trim(),
      format: "pdf" as const,
      scope,
      ...(scope === "jurisdiction" && cityTown ? { cityTown } : {}),
      ...(scope === "jurisdiction" && legDistrict !== undefined
        ? { legDistrict }
        : {}),
      ...(meetingDate ? { meetingDate } : {}),
    };

    await generateReportMutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Report Name */}
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

      {/* Scope Selector — only show for Admins */}
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

      {/* City/Town Filter */}
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

      {/* Leg District Filter — only for Rochester */}
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

      {/* Meeting Date */}
      <div className="space-y-2">
        <Label htmlFor="meetingDate">Meeting Date (optional)</Label>
        <Input
          id="meetingDate"
          type="date"
          value={meetingDate}
          onChange={(e) => setMeetingDate(e.target.value)}
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={
            generateReportMutation.loading ||
            (hasSubmitted && Object.keys(errors).length > 0)
          }
        >
          {generateReportMutation.loading ? "Generating..." : "Generate PDF"}
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

      {/* Status Display */}
      {generateReportMutation.loading && (
        <div className="bg-primary-foreground p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Generating sign-in sheet...</span>
          </div>
        </div>
      )}

      {/* Report Status Tracker */}
      {reportId && (
        <ReportStatusTracker
          reportId={reportId}
          onComplete={handleReportComplete}
          onError={handleReportError}
        />
      )}

      {/* PDF Report Display */}
      {reportUrl && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 py-2">
            <p className="font-medium">
              Sign-in sheet generated successfully!
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
          <iframe
            className="w-full h-[100vh] max-w-[800px] max-h-[1200px] border rounded-lg"
            src={reportUrl}
            title="Generated Sign-In Sheet PDF"
          />
        </div>
      )}
    </form>
  );
}
