"use client";
/**
 * PROTOTYPE — Variant B: full-width index and detail (plan §4). A single
 * full-width, sortable committee table; selecting a row navigates to a
 * dedicated full-page detail view with a breadcrumb + back button. Back
 * (button or browser) returns to the table with filters, sort and scroll
 * position intact. Below `md` the table collapses to a card list.
 *
 * Read-only against `mockData.ts`; every mutation is a toast.
 */
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PrivilegeLevel } from "@prisma/client";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Search,
  X,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useToast } from "~/components/ui/use-toast";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import type {
  CommitteeDetailResponse,
  EdRollup,
  HistoryEvent,
} from "~/lib/validations/committee";

import { AddMemberDrawerStub, type PrototypeAction } from "./AddMemberDrawerStub";
import {
  MOCK_BY_ID,
  MOCK_ROLLUPS,
  TERM,
  capitalize,
  summarize,
} from "./mockData";

const TABS = ["roster", "pending", "seats", "history"] as const;
type Tab = (typeof TABS)[number];

const SORT_KEYS = ["town", "ld", "ed", "filled", "open", "weight", "pending", "activity"] as const;
type SortKey = (typeof SORT_KEYS)[number];
type SortDir = "asc" | "desc";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const fmtRelative = (iso: string | null) => {
  if (!iso) return "—";
  const days = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return fmtDate(iso);
};

/** Most recent history event per committee — the "last activity" column. */
const lastActivity = (id: number): string | null =>
  MOCK_BY_ID.get(id)?.detail.history.events[0]?.at ?? null;

export function VariantB() {
  const router = useRouter();
  const pathname = usePathname() ?? "/committees";
  const sp = useSearchParams();
  const { toast } = useToast();
  const { actingPermissions } = useContext(GlobalContext);
  const isAdmin = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);
  const canAct = hasPermissionFor(actingPermissions, PrivilegeLevel.RequestAccess);

  // --- URL state (plan §6): committee + tab + filters --------------------
  const town = sp?.get("town") ?? "";
  const ld = sp?.get("ld") ?? "";
  const committeeParam = Number(sp?.get("committee"));
  const tab = (TABS as readonly string[]).includes(sp?.get("tab") ?? "")
    ? (sp.get("tab") as Tab)
    : "roster";

  const setParams = (patch: Record<string, string | null>, mode: "push" | "replace" = "replace") => {
    const p = new URLSearchParams(sp?.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") p.delete(k);
      else p.set(k, v);
    }
    p.set("variant", "B");
    router[mode](`${pathname}?${p.toString()}`, { scroll: false });
  };

  // --- Local-only table state (survives the detail round-trip because this
  // component stays mounted; only the search params change) ---------------
  const [query, setQuery] = useState("");
  const [onlyVacant, setOnlyVacant] = useState(false);
  const [onlyPending, setOnlyPending] = useState(false);
  const [onlyMissingWeight, setOnlyMissingWeight] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("town");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [action, setAction] = useState<PrototypeAction>(null);
  const savedScroll = useRef(0);

  const towns = useMemo(() => Array.from(new Set(MOCK_ROLLUPS.map((r) => r.cityTown))), []);
  const ldsForTown = useMemo(
    () =>
      Array.from(new Set(MOCK_ROLLUPS.filter((r) => !town || r.cityTown === town).map((r) => r.legDistrict))).sort(
        (a, b) => a - b,
      ),
    [town],
  );

  const visible = useMemo(
    () =>
      MOCK_ROLLUPS.filter(
        (r) =>
          (!town || r.cityTown === town) &&
          (!ld || r.legDistrict === Number(ld)) &&
          (!query || String(r.electionDistrict) === query.trim() || capitalize(r.cityTown).toLowerCase().includes(query.toLowerCase())) &&
          (!onlyVacant || r.filled < r.totalSeats) &&
          (!onlyPending || r.pendingCount > 0) &&
          (!onlyMissingWeight || r.missingWeightSeatNumbers.length > 0),
      ),
    [town, ld, query, onlyVacant, onlyPending, onlyMissingWeight],
  );

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const key = (r: EdRollup): string | number => {
      switch (sortKey) {
        case "town": return r.cityTown;
        case "ld": return r.legDistrict;
        case "ed": return r.electionDistrict;
        case "filled": return r.filled / r.totalSeats;
        case "open": return r.totalSeats - r.filled;
        case "weight": return r.missingWeightSeatNumbers.length > 0 ? 0 : 1;
        case "pending": return r.pendingCount;
        case "activity": return lastActivity(r.committeeListId) ?? "";
      }
    };
    // Stable secondary order: town → LD → ED, so ties read naturally.
    const tie = (a: EdRollup, b: EdRollup) =>
      a.cityTown.localeCompare(b.cityTown) || a.legDistrict - b.legDistrict || a.electionDistrict - b.electionDistrict;
    return [...visible].sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      const c = typeof ka === "string" && typeof kb === "string" ? ka.localeCompare(kb) : Number(ka) - Number(kb);
      return c !== 0 ? c * dir : tie(a, b);
    });
  }, [visible, sortKey, sortDir]);

  const summary = useMemo(() => summarize(visible), [visible]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "town" || k === "ld" || k === "ed" ? "asc" : "desc");
    }
  };

  // --- Selection: the URL decides whether we're on the index or the detail
  const selected = MOCK_BY_ID.get(committeeParam) ?? null;
  const showingDetail = selected !== null;
  const selectedIdx = selected ? sorted.findIndex((r) => r.committeeListId === selected.rollup.committeeListId) : -1;
  const prev = selectedIdx > 0 ? sorted[selectedIdx - 1] : undefined;
  const next = selectedIdx >= 0 && selectedIdx < sorted.length - 1 ? sorted[selectedIdx + 1] : undefined;

  const select = (r: EdRollup) => {
    savedScroll.current = window.scrollY;
    setParams({ committee: String(r.committeeListId) }, "push");
  };
  const back = () => setParams({ committee: null, tab: null });

  // Scroll to top on entering detail; restore the table's scroll on return
  // (covers both the Back button and the browser back button).
  useEffect(() => {
    if (showingDetail) window.scrollTo({ top: 0 });
    else window.scrollTo({ top: savedScroll.current });
  }, [showingDetail, committeeParam]);

  const stub = (what: string) =>
    toast({ title: `${what} (stubbed)`, description: "Prototype: nothing was changed." });

  const activeFilterCount = [town, ld, query, onlyVacant, onlyPending, onlyMissingWeight].filter(Boolean).length;
  const clearFilters = () => {
    setQuery("");
    setOnlyVacant(false);
    setOnlyPending(false);
    setOnlyMissingWeight(false);
    setParams({ town: null, ld: null });
  };

  // ------------------------------------------------------------------------
  if (showingDetail) {
    return (
      <div className="w-full">
        <DetailPage
          detail={selected.detail}
          tab={tab}
          onTab={(t) => setParams({ tab: t })}
          onBack={back}
          prev={prev}
          next={next}
          onJump={(r) => setParams({ committee: String(r.committeeListId) })}
          position={selectedIdx >= 0 ? { index: selectedIdx + 1, total: sorted.length } : null}
          isAdmin={isAdmin}
          canAct={canAct}
          onAction={setAction}
          stub={stub}
        />
        <AddMemberDrawerStub action={action} role={actingPermissions} onClose={() => setAction(null)} />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Workspace header */}
      <header className="flex flex-wrap items-end justify-between gap-3 px-4 pb-3 pt-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight">Committees</h1>
          <p className="text-sm text-slate-500">
            {TERM.label} term · {summary.edCount} EDs · {summary.filled} of {summary.totalSeats} seats filled
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Link href="/committees/requests">
              <Button size="sm" variant="outline">
                Review pending
              </Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => stub("Generate report")}>
              Generate report
            </Button>
          </div>
        )}
      </header>

      {/* Scope stats — reflect the current filter, not the whole county */}
      <div className="grid grid-cols-2 gap-2 px-4 pb-3 sm:px-6 md:grid-cols-4">
        <Stat label="Open seats" value={String(summary.vacant)} warn={summary.vacant > 0} />
        <Stat label="Pending review" value={String(summary.pendingCount)} />
        <Stat
          label="Missing weight"
          value={String(visible.filter((r) => r.missingWeightSeatNumbers.length > 0).length)}
          warn={visible.some((r) => r.missingWeightSeatNumbers.length > 0)}
        />
        <Stat label="Unassigned members" value={String(summary.unassignedCount)} />
      </div>

      {/* Toolbar — sticky so filters stay reachable while scrolling a long table */}
      <div className="sticky top-0 z-20 border-b border-t bg-white/95 px-4 py-2 backdrop-blur sm:px-6 dark:bg-slate-950/95">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border bg-white px-2 text-sm dark:bg-slate-950"
            value={town}
            onChange={(e) => setParams({ town: e.target.value, ld: null })}
          >
            <option value="">All towns</option>
            {towns.map((t) => (
              <option key={t} value={t}>
                {capitalize(t)}
              </option>
            ))}
          </select>
          <select
            className="h-9 w-24 rounded-md border bg-white px-2 text-sm dark:bg-slate-950"
            value={ld}
            onChange={(e) => setParams({ ld: e.target.value })}
          >
            <option value="">All LDs</option>
            {ldsForTown.map((n) => (
              <option key={n} value={n}>
                LD {n}
              </option>
            ))}
          </select>
          <div className="relative min-w-[160px] flex-1 sm:max-w-xs">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="h-9 pl-8"
              placeholder="ED number or town"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1 text-xs">
            {(
              [
                ["Open seats", onlyVacant, setOnlyVacant],
                ["Pending", onlyPending, setOnlyPending],
                ["Missing weight", onlyMissingWeight, setOnlyMissingWeight],
              ] as const
            ).map(([label, on, set]) => (
              <button
                key={label}
                onClick={() => set(!on)}
                className={`rounded-full border px-2 py-1 ${
                  on
                    ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-0.5 px-2 py-1 text-slate-500 underline">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          {/* Mobile sort control; desktop sorts via column headers */}
          <label className="ml-auto flex items-center gap-1 text-xs text-slate-500 md:hidden">
            Sort
            <select
              className="h-8 rounded-md border bg-white px-1 text-xs dark:bg-slate-950"
              value={`${sortKey}:${sortDir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split(":") as [SortKey, SortDir];
                setSortKey(k);
                setSortDir(d);
              }}
            >
              <option value="town:asc">Town A–Z</option>
              <option value="ed:asc">ED number</option>
              <option value="open:desc">Most open seats</option>
              <option value="pending:desc">Most pending</option>
              <option value="weight:desc">Weight missing first</option>
              <option value="activity:desc">Recent activity</option>
            </select>
          </label>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {sorted.length} of {MOCK_ROLLUPS.length} committees
        </p>
      </div>

      {sorted.length === 0 && (
        <div className="p-10 text-center text-sm text-slate-500">No committees match these filters.</div>
      )}

      {/* Desktop: the full-width table */}
      {sorted.length > 0 && (
        <table className="hidden w-full text-sm md:table">
          <thead className="sticky top-[86px] z-10 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900">
            <tr className="border-b">
              <SortTh label="Town" k="town" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="pl-4 sm:pl-6" />
              <SortTh label="LD" k="ld" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh label="ED" k="ed" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh label="Seats" k="filled" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortTh label="Open" k="open" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
              <SortTh label="Weight" k="weight" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortTh label="Pending" k="pending" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
              <th className="hidden px-3 py-2 text-right font-medium lg:table-cell">Unassigned</th>
              <SortTh label="Last activity" k="activity" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="hidden xl:table-cell" />
              <th className="w-10 py-2 pr-4 sm:pr-6" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const open = r.totalSeats - r.filled;
              const missing = r.missingWeightSeatNumbers.length;
              return (
                <tr
                  key={r.committeeListId}
                  onClick={() => select(r)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      select(r);
                    }
                  }}
                  className="cursor-pointer border-b border-slate-100 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none dark:border-slate-800 dark:hover:bg-blue-950 dark:focus:bg-blue-950"
                >
                  <td className="py-2 pl-4 pr-3 font-medium sm:pl-6">{capitalize(r.cityTown)}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{r.legDistrict}</td>
                  <td className="px-3 py-2 font-medium tabular-nums">{r.electionDistrict}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <SeatDots filled={r.filled} total={r.totalSeats} />
                      <span className="tabular-nums text-slate-600 dark:text-slate-300">
                        {r.filled}/{r.totalSeats}
                      </span>
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${open ? "font-medium" : "text-slate-400"}`}>{open || "—"}</td>
                  <td className="hidden px-3 py-2 lg:table-cell">
                    {missing > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" /> seat {r.missingWeightSeatNumbers.join(", ")}
                      </span>
                    ) : r.designationWeight !== null ? (
                      <span className="tabular-nums text-slate-600 dark:text-slate-300">{r.designationWeight.toFixed(2)}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.pendingCount > 0 ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 text-xs text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                        <Clock className="h-3 w-3" />
                        {r.pendingCount}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="hidden px-3 py-2 text-right tabular-nums lg:table-cell">
                    {r.unassignedCount || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="hidden px-3 py-2 text-slate-500 xl:table-cell">{fmtRelative(lastActivity(r.committeeListId))}</td>
                  <td className="py-2 pr-4 text-right sm:pr-6">
                    <ChevronRight className="inline h-4 w-4 text-slate-300" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Mobile: card list */}
      {sorted.length > 0 && (
        <ul className="divide-y md:hidden">
          {sorted.map((r) => {
            const open = r.totalSeats - r.filled;
            return (
              <li key={r.committeeListId}>
                <button onClick={() => select(r)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium">{capitalize(r.cityTown)}</span>
                      <span className="text-xs text-slate-500">LD {r.legDistrict}</span>
                      <span className="text-sm font-medium">ED {r.electionDistrict}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <SeatDots filled={r.filled} total={r.totalSeats} />
                        {r.filled}/{r.totalSeats}
                      </span>
                      {open > 0 && <span>{open} open</span>}
                      {r.pendingCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-amber-800 dark:text-amber-300">
                          <Clock className="h-3 w-3" /> {r.pendingCount} pending
                        </span>
                      )}
                      {r.missingWeightSeatNumbers.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" /> weight
                        </span>
                      )}
                      {r.unassignedCount > 0 && <span>+{r.unassignedCount} unassigned</span>}
                      <span className="text-slate-400">{fmtRelative(lastActivity(r.committeeListId))}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AddMemberDrawerStub action={action} role={actingPermissions} onClose={() => setAction(null)} />
    </div>
  );
}

function SortTh({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
  align = "left",
  className = "",
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = k === sortKey;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : ""} ${className}`}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
    >
      <button
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 ${active ? "text-slate-900 dark:text-slate-100" : ""}`}
      >
        {label}
        <Icon className={`h-3 w-3 ${active ? "" : "opacity-40"}`} />
      </button>
    </th>
  );
}

function SeatDots({ filled, total }: { filled: number; total: number }) {
  return (
    <span className="flex shrink-0 gap-0.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${i < filled ? "bg-emerald-500" : "border border-slate-400"}`}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------

function DetailPage({
  detail,
  tab,
  onTab,
  onBack,
  prev,
  next,
  onJump,
  position,
  isAdmin,
  canAct,
  onAction,
  stub,
}: {
  detail: CommitteeDetailResponse;
  tab: Tab;
  onTab: (t: Tab) => void;
  onBack: () => void;
  prev?: EdRollup;
  next?: EdRollup;
  onJump: (r: EdRollup) => void;
  position: { index: number; total: number } | null;
  isAdmin: boolean;
  canAct: boolean;
  onAction: (a: PrototypeAction) => void;
  stub: (what: string) => void;
}) {
  const { committee: c, rollup, rows, pending, designationWeightSummary: dw, history } = detail;
  const open = rollup.totalSeats - rollup.filled;
  const addLabel = isAdmin ? "Add member" : "Submit candidate";

  return (
    <>
      {/* Breadcrumb + back — the prominent way home */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b bg-white/95 px-4 py-2 backdrop-blur sm:px-6 dark:bg-slate-950/95">
        <div className="flex min-w-0 items-center gap-3">
          <Button size="sm" variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" /> All committees
          </Button>
          <nav className="hidden min-w-0 items-center gap-1 truncate text-sm text-slate-500 sm:flex" aria-label="Breadcrumb">
            <button className="hover:underline" onClick={onBack}>
              Committees
            </button>
            <ChevronRight className="h-3 w-3" />
            <span>{capitalize(c.cityTown)}</span>
            <ChevronRight className="h-3 w-3" />
            <span>LD {c.legDistrict}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-slate-900 dark:text-slate-100">ED {c.electionDistrict}</span>
          </nav>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          {position && (
            <span className="mr-1 tabular-nums">
              {position.index} of {position.total}
            </span>
          )}
          <Button size="sm" variant="ghost" className="h-8 px-2" disabled={!prev} onClick={() => prev && onJump(prev)} title={prev ? `${capitalize(prev.cityTown)} ED ${prev.electionDistrict}` : undefined}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-2" disabled={!next} onClick={() => next && onJump(next)} title={next ? `${capitalize(next.cityTown)} ED ${next.electionDistrict}` : undefined}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Page header */}
      <div className="px-4 pb-4 pt-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {capitalize(c.cityTown)} · Legislative District {c.legDistrict} · {TERM.label}
            </div>
            <h1 className="text-3xl font-semibold leading-tight">Election District {c.electionDistrict}</h1>
            <div className="mt-2 flex flex-wrap gap-1">
              {open > 0 ? (
                <Badge variant="outline">{open} open</Badge>
              ) : (
                <Badge variant="secondary">Full</Badge>
              )}
              {rollup.pendingCount > 0 && (
                <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-100">
                  {rollup.pendingCount} pending
                </Badge>
              )}
              {rollup.missingWeightSeatNumbers.length > 0 && (
                <Badge variant="destructive">
                  Weight missing: seat {rollup.missingWeightSeatNumbers.join(", ")}
                </Badge>
              )}
              {rollup.unassignedCount > 0 && <Badge variant="outline">{rollup.unassignedCount} unassigned</Badge>}
            </div>
          </div>
          {canAct && (
            <Button className="shrink-0" onClick={() => onAction({ kind: "add-member", committee: rollup })}>
              <Plus className="mr-1 h-4 w-4" /> {addLabel}
            </Button>
          )}
        </div>

        {/* At-a-glance strip — room for it on a full page */}
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Seats filled" value={`${rollup.filled} of ${rollup.totalSeats}`} warn={open > 0} />
          <Stat label="LTED weight" value={c.ltedWeight ?? "Not set"} warn={!c.ltedWeight} />
          <Stat label="Designation weight" value={dw.missingWeightSeatNumbers.length ? "Incomplete" : dw.totalWeight.toFixed(2)} warn={dw.missingWeightSeatNumbers.length > 0} />
          <Stat label="Last activity" value={history.events[0] ? fmtDate(history.events[0].at) : "—"} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => onTab(v as Tab)} className="w-full">
        <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b bg-transparent p-0 px-2 sm:px-4">
          {(
            [
              ["roster", "Roster", null],
              ["pending", "Pending", pending.length || null],
              ["seats", "Seats & Weight", dw.missingWeightSeatNumbers.length || null],
              ["history", "History", null],
            ] as const
          ).map(([k, label, n]) => (
            <TabsTrigger
              key={k}
              value={k}
              className="rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-slate-900 data-[state=active]:shadow-none dark:data-[state=active]:border-slate-100"
            >
              {label}
              {n ? <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-xs dark:bg-slate-700">{n}</span> : null}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Roster */}
        <TabsContent value="roster" className="m-0 p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr className="border-b">
                <th className="py-2 pl-4 pr-2 font-medium sm:pl-6">Seat</th>
                <th className="px-2 py-2 font-medium">Member</th>
                <th className="hidden px-2 py-2 font-medium sm:table-cell">Type</th>
                <th className="hidden px-2 py-2 text-right font-medium md:table-cell">Weight</th>
                {isAdmin && <th className="hidden px-2 py-2 font-medium lg:table-cell">Contact</th>}
                <th className="py-2 pl-2 pr-4 sm:pr-6" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.seatNumber ?? `u-${r.occupant?.VRCNUM}`} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pl-4 pr-2 align-top sm:pl-6">
                    {r.seatNumber === null ? (
                      <span className="text-slate-500">—</span>
                    ) : (
                      <span className="font-medium">{r.seatNumber}</span>
                    )}
                    {r.isPetitioned && (
                      <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] uppercase text-slate-500 dark:bg-slate-800">P</span>
                    )}
                  </td>
                  <td className="px-2 py-2 align-top">
                    {r.occupant ? (
                      <>
                        <div className="font-medium">
                          {r.occupant.firstName} {r.occupant.lastName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {r.occupant.VRCNUM}
                          {r.unassigned && " · unassigned"}
                        </div>
                      </>
                    ) : (
                      <span className="italic text-slate-400">Vacant{r.petitionedVacant ? " (petitioned seat)" : ""}</span>
                    )}
                  </td>
                  <td className="hidden px-2 py-2 align-top text-slate-600 sm:table-cell dark:text-slate-300">
                    {r.occupant?.membershipType ? capitalize(r.occupant.membershipType) : ""}
                  </td>
                  <td className="hidden px-2 py-2 text-right align-top tabular-nums md:table-cell">
                    {r.isPetitioned ? (
                      r.weight ?? <span className="text-amber-600" title="Missing weight">—</span>
                    ) : (
                      <span className="text-slate-300">n/a</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="hidden px-2 py-2 align-top text-xs text-slate-500 lg:table-cell">
                      {r.contact?.email ?? ""}
                      {r.contact?.email && r.contact.phone ? <br /> : null}
                      {r.contact?.phone ?? ""}
                    </td>
                  )}
                  <td className="py-2 pl-2 pr-4 text-right align-top sm:pr-6">
                    {canAct &&
                      (r.occupant ? (
                        <div className="flex justify-end gap-1">
                          {!isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() =>
                                onAction({
                                  kind: "add-member",
                                  committee: rollup,
                                  seatNumber: r.seatNumber ?? undefined,
                                  replacingName: `${r.occupant!.firstName} ${r.occupant!.lastName}`,
                                })
                              }
                            >
                              Replace
                            </Button>
                          )}
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => stub("Record resignation")}>
                                Resign
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-700" onClick={() => stub("Remove member")}>
                                Remove
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => onAction({ kind: "add-member", committee: rollup, seatNumber: r.seatNumber ?? undefined })}
                        >
                          <Plus className="mr-1 h-3 w-3" /> {isAdmin ? "Add" : "Submit"}
                        </Button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>

        {/* Pending */}
        <TabsContent value="pending" className="m-0 max-w-3xl space-y-2 p-4 sm:p-6">
          {pending.length === 0 && <p className="text-sm text-slate-500">No submissions awaiting review.</p>}
          {pending.map((p) => (
            <div key={p.membershipId} className="rounded-md border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {p.firstName} {p.lastName}
                    {p.isOwnSubmission && <Badge variant="outline" className="ml-2">Yours</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">
                    Submitted {fmtDate(p.submittedAt)}
                    {isAdmin && p.submittedBy?.name && ` by ${p.submittedBy.name}`}
                    {p.replacementFor && ` · replacing ${p.replacementFor.firstName} ${p.replacementFor.lastName}`}
                  </div>
                  {isAdmin && p.requestNotes && <p className="mt-1 text-slate-600 dark:text-slate-300">“{p.requestNotes}”</p>}
                </div>
                {isAdmin && (
                  <Link href="/committees/requests" className="shrink-0 text-xs underline">
                    Review in requests
                  </Link>
                )}
              </div>
            </div>
          ))}
          {isAdmin && pending.length > 0 && (
            <p className="pt-2 text-xs text-slate-500">
              Decisions are made per meeting on <Link className="underline" href="/committees/requests">/committees/requests</Link>; this tab only lists them.
            </p>
          )}
        </TabsContent>

        {/* Seats & Weight */}
        <TabsContent value="seats" className="m-0 max-w-3xl space-y-4 p-4 text-sm sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="LTED weight" value={c.ltedWeight ?? "Not set"} warn={!c.ltedWeight} />
            <Stat label="Designation weight" value={dw.missingWeightSeatNumbers.length ? "Incomplete" : dw.totalWeight.toFixed(2)} warn={dw.missingWeightSeatNumbers.length > 0} />
            <Stat label="Contributing seats" value={`${dw.totalContributingSeats} of ${dw.seats.length}`} />
          </div>
          {dw.missingWeightSeatNumbers.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                Petitioned seat{dw.missingWeightSeatNumbers.length > 1 ? "s" : ""} {dw.missingWeightSeatNumbers.join(", ")} ha
                {dw.missingWeightSeatNumbers.length > 1 ? "ve" : "s"} no weight, so the designation total cannot be computed.
              </div>
            </div>
          )}
          <table className="w-full">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr className="border-b">
                <th className="py-1 font-medium">Seat</th>
                <th className="py-1 font-medium">Petitioned</th>
                <th className="py-1 font-medium">Occupied</th>
                <th className="py-1 text-right font-medium">Seat weight</th>
                <th className="py-1 text-right font-medium">Contributes</th>
              </tr>
            </thead>
            <tbody>
              {dw.seats.map((s) => (
                <tr key={s.seatNumber} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-1.5">{s.seatNumber}</td>
                  <td className="py-1.5">{s.isPetitioned ? "Yes" : "No"}</td>
                  <td className="py-1.5">{s.isOccupied ? capitalize(s.occupantMembershipType ?? "") : <span className="text-slate-400">Vacant</span>}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {s.isPetitioned ? (
                      s.seatWeight !== null ? (
                        <button className="underline decoration-dotted" onClick={() => stub("Edit seat weight")}>
                          {s.seatWeight.toFixed(2)}
                        </button>
                      ) : (
                        <button className="text-amber-700 underline decoration-dotted" onClick={() => stub("Set seat weight")}>
                          set
                        </button>
                      )
                    ) : (
                      <span className="text-slate-300">n/a</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{s.contributes ? s.contributionWeight.toFixed(2) : <span className="text-slate-300">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => stub("Edit LTED weight")}>
              Edit LTED weight
            </Button>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="m-0 max-w-3xl p-4 sm:p-6">
          {history.events.length === 0 && <p className="text-sm text-slate-500">No recorded events this term.</p>}
          <ol className="relative ml-2 border-l border-slate-200 dark:border-slate-800">
            {history.events.map((e) => (
              <li key={e.id} className="mb-4 ml-4 text-sm">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-400 dark:border-slate-950" />
                <div className="text-xs text-slate-500">
                  {fmtDate(e.at)} · {e.actor.role}
                  {isAdmin && e.actor.name ? ` (${e.actor.name})` : ""}
                </div>
                <div>{describeEvent(e, isAdmin)}</div>
              </li>
            ))}
          </ol>
          {history.hasMore && <p className="text-xs text-slate-500">Older events not loaded.</p>}
        </TabsContent>
      </Tabs>
    </>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${warn ? "text-amber-700" : ""}`}>{value}</div>
    </div>
  );
}

function describeEvent(e: HistoryEvent, isAdmin: boolean): React.ReactNode {
  const who = <span className="font-medium">{e.member.name}</span>;
  const seat = e.member.seatNumber !== null ? ` (seat ${e.member.seatNumber})` : "";
  switch (e.kind) {
    case "submitted":
      return <>{who} submitted for review{seat}{isAdmin && e.requestNotes ? ` — “${e.requestNotes}”` : ""}</>;
    case "rejected":
      return <>{who} rejected{e.meeting ? ` at the ${fmtDate(e.meeting.meetingDate)} meeting` : ""}{isAdmin && e.rejectionNote ? ` — ${e.rejectionNote}` : ""}</>;
    case "confirmed":
      return <>{who} confirmed{seat}{e.meeting ? ` at the ${fmtDate(e.meeting.meetingDate)} meeting` : ""}</>;
    case "activated":
      return <>{who} added{seat}{isAdmin && e.overrideReason ? ` — override: ${e.overrideReason}` : ""}</>;
    case "resigned":
      return <>{who} resigned{seat}{e.effectiveDate ? `, effective ${fmtDate(e.effectiveDate)}` : ""}{isAdmin && e.method ? ` (by ${e.method.toLowerCase()})` : ""}</>;
    case "removed":
      return <>{who} removed{seat}{isAdmin && e.reason ? ` — ${capitalize(e.reason.replace(/_/g, " "))}` : ""}</>;
    case "petition_outcome":
      return <>{who} {e.outcome === "won" ? "won" : e.outcome === "lost" ? "lost" : "tied"} the {e.primaryDate ? fmtDate(e.primaryDate) : ""} primary{e.seatNumber !== null ? ` for seat ${e.seatNumber}` : ""}{e.voteCount !== null ? ` (${e.voteCount} votes)` : ""}</>;
  }
}
