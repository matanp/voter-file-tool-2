"use client";

import * as React from "react";
import { useContext, useMemo, useState } from "react";
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
import {
  SCOPE_REPORT_REGISTRY,
  type GenerateReportData,
  type ScopeReportType,
  type ScopedReportData,
} from "@voter-file-tool/shared-validators";
import {
  SCOPE_REPORT_FORM_MESSAGES,
  defaultScopedReportName,
  last30DaysIsoRange,
} from "./scopeReportFormSpecs";
import { SCOPE_REPORT_UI } from "./scopeReportUiRegistry";

interface ScopedReportFormProps {
  type: ScopeReportType;
  committeeLists: CommitteeList[];
  userPrivilegeLevel: PrivilegeLevel;
}

type Scope = "jurisdiction" | "countywide";
type ReportFormat = "pdf" | "xlsx";
type VacancyFilter = "all" | "vacantOnly";

function getDefaultFormat(type: ScopeReportType): ReportFormat {
  const formatDef = SCOPE_REPORT_REGISTRY[type].format;
  if (formatDef.kind === "fixed") {
    return formatDef.value;
  }
  return formatDef.default;
}

export function ScopedReportForm({
  type,
  committeeLists,
  userPrivilegeLevel,
}: ScopedReportFormProps) {
  const ui = SCOPE_REPORT_UI[type];
  const messages = SCOPE_REPORT_FORM_MESSAGES[type];
  const formatDef = SCOPE_REPORT_REGISTRY[type].format;

  const { toast } = useToast();
  const { actingPermissions } = useContext(GlobalContext);

  const effectivePrivilege = actingPermissions ?? userPrivilegeLevel;
  const isAdmin = hasPermissionFor(effectivePrivilege, PrivilegeLevel.Admin);
  const isLeaderOnly = !isAdmin;

  const defaultRange = last30DaysIsoRange();

  const [name, setName] = useState(() =>
    defaultScopedReportName(ui.defaultNamePrefix),
  );
  const [format, setFormat] = useState<ReportFormat>(() =>
    getDefaultFormat(type),
  );
  const [scope, setScope] = useState<Scope>(
    isLeaderOnly ? "jurisdiction" : "countywide",
  );
  const [cityTown, setCityTown] = useState("");
  const [legDistrict, setLegDistrict] = useState<number | undefined>(undefined);
  const [meetingDate, setMeetingDate] = useState("");
  const [vacancyFilter, setVacancyFilter] =
    useState<VacancyFilter>("vacantOnly");
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
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
        title: messages.toastStartedTitle,
        description: messages.toastStartedDescription,
      });
    },
    onError: (error) => {
      const msg =
        error instanceof Error ? error.message : messages.errorFallback;
      toast({
        title: "Error",
        description: `Failed to generate report: ${msg}`,
        variant: "destructive",
      });
    },
  });

  const clearFieldError = (field: string) => {
    if (!errors[field]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (value.trim()) {
      clearFieldError("name");
    }
  };

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Report name is required";
    }
    if (scope === "jurisdiction" && !cityTown) {
      newErrors.cityTown =
        "City/Town selection is required for jurisdiction scope";
    }
    if (type === "changesReport") {
      if (!dateFrom) newErrors.dateFrom = "Start date is required";
      if (!dateTo) newErrors.dateTo = "End date is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleCityChange = (value: string) => {
    setCityTown(value);
    setLegDistrict(undefined);
    if (value) {
      clearFieldError("cityTown");
    }
  };

  const buildPayload = (): ScopedReportData => {
    const base = {
      type,
      name: name.trim(),
      scope,
      ...(scope === "jurisdiction" && cityTown ? { cityTown } : {}),
      ...(scope === "jurisdiction" && legDistrict !== undefined
        ? { legDistrict }
        : {}),
    };

    switch (type) {
      case "signInSheet":
        return {
          ...base,
          type: "signInSheet",
          format: "pdf",
          ...(meetingDate ? { meetingDate } : {}),
        };
      case "committeeRoster":
        return {
          ...base,
          type: "committeeRoster",
          format,
          includeFields: [],
        };
      case "designationWeightSummary":
        return {
          ...base,
          type: "designationWeightSummary",
          format,
        };
      case "vacancyReport":
        return {
          ...base,
          type: "vacancyReport",
          format,
          vacancyFilter,
        };
      case "changesReport":
        return {
          ...base,
          type: "changesReport",
          format,
          dateFrom,
          dateTo,
        };
      case "petitionOutcomesReport":
        return {
          ...base,
          type: "petitionOutcomesReport",
          format,
        };
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setHasSubmitted(true);
    if (!validate()) return;
    setReportUrl(null);
    await generateReportMutation.mutate(buildPayload());
  };

  const submitLabel =
    type === "signInSheet"
      ? messages.submitLabel
      : generateReportMutation.loading
        ? "Generating..."
        : messages.submitLabel;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="reportName">Report Name</Label>
        <Input
          id="reportName"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Enter report name"
        />
        {hasSubmitted && errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      {formatDef.kind === "select" && (
        <div className="space-y-2">
          <Label htmlFor="reportFormat">Format</Label>
          <select
            id="reportFormat"
            value={format}
            onChange={(e) => setFormat(e.target.value as ReportFormat)}
            className="border rounded px-3 py-2 w-full max-w-[120px]"
          >
            {formatDef.options.map((option) => (
              <option key={option} value={option}>
                {option.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      )}

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
            onSelect={(value) =>
              setLegDistrict(value ? Number(value) : undefined)
            }
          />
        </div>
      )}

      {type === "signInSheet" && (
        <div className="space-y-2">
          <Label htmlFor="meetingDate">Meeting Date (optional)</Label>
          <Input
            id="meetingDate"
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
          />
        </div>
      )}

      {type === "vacancyReport" && (
        <div className="space-y-2">
          <Label>Vacancy Filter</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="vacancyFilter"
                value="vacantOnly"
                checked={vacancyFilter === "vacantOnly"}
                onChange={() => setVacancyFilter("vacantOnly")}
                className="accent-primary"
              />
              <span className="text-sm">Vacant only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="vacancyFilter"
                value="all"
                checked={vacancyFilter === "all"}
                onChange={() => setVacancyFilter("all")}
                className="accent-primary"
              />
              <span className="text-sm">Show all</span>
            </label>
          </div>
        </div>
      )}

      {type === "changesReport" && (
        <div className="flex gap-4">
          <div className="space-y-2 flex-1">
            <Label htmlFor="dateFrom">Start Date</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                if (e.target.value) clearFieldError("dateFrom");
              }}
            />
            {hasSubmitted && errors.dateFrom && (
              <p className="text-sm text-destructive">{errors.dateFrom}</p>
            )}
          </div>
          <div className="space-y-2 flex-1">
            <Label htmlFor="dateTo">End Date</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                if (e.target.value) clearFieldError("dateTo");
              }}
            />
            {hasSubmitted && errors.dateTo && (
              <p className="text-sm text-destructive">{errors.dateTo}</p>
            )}
          </div>
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
          {generateReportMutation.loading ? "Generating..." : submitLabel}
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
        <div className="bg-primary-foreground p-4 rounded-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          <span>{messages.loadingMessage}</span>
        </div>
      )}

      {reportId && (
        <ReportStatusTracker
          reportId={reportId}
          onComplete={(url) => {
            toast({
              description: messages.successToast,
              duration: 5000,
            });
            setReportUrl(url);
            setReportId(null);
          }}
          onError={(msg) => {
            toast({
              variant: "destructive",
              title: "Generation Failed",
              description: msg || messages.errorFallback,
              duration: 5000,
            });
            setReportId(null);
          }}
        />
      )}

      {reportUrl && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 py-2">
            <p className="font-medium">{messages.successHeading}</p>
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              Open in New Tab
            </a>
          </div>
          {messages.showPdfPreview && (
            <iframe
              className="w-full h-[100vh] max-w-[800px] max-h-[1200px] border rounded-lg"
              src={reportUrl}
              title="Generated Report PDF"
            />
          )}
        </div>
      )}
    </form>
  );
}
