"use client";
/**
 * PROTOTYPE — Variant C: dashboard with expanding detail (plan §4). Global
 * metric cards on top double as filters; committees are grouped by town (and
 * by LD inside multi-LD towns) in collapsible sections; selecting a row expands
 * an accordion region directly beneath it with the same four tabs as A and an
 * action bar. No side pane, no dedicated detail page — everything is inline.
 *
 * Read-only against `mockData.ts`; every mutation is a toast.
 */
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PrivilegeLevel } from "@prisma/client";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Plus,
  Scale,
  Search,
  UserMinus,
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
import { MOCK_BY_ID, MOCK_ROLLUPS, TERM, capitalize, summarize } from "./mockData";

const TABS = ["roster", "pending", "seats", "history"] as const;
type Tab = (typeof TABS)[number];

/** Metric-card filters. "all" is the neutral card. */
const METRICS = ["all", "vacant", "pending", "missingWeight", "unassigned", "full"] as const;
type Metric = (typeof METRICS)[number];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const matchesMetric = (r: EdRollup, m: Metric) => {
  switch (m) {
    case "all":
      return true;
    case "vacant":
      return r.filled < r.totalSeats;
    case "pending":
      return r.pendingCount > 0;
    case "missingWeight":
      return r.missingWeightSeatNumbers.length > 0;
    case "unassigned":
      return r.unassignedCount > 0;
    case "full":
      return r.filled >= r.totalSeats;
  }
};

export function VariantC() {
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
    p.set("variant", "C");
    router[mode](`${pathname}?${p.toString()}`, { scroll: false });
  };

  // --- Local-only state --------------------------------------------------
  const [query, setQuery] = useState("");
  const [metric, setMetric] = useState<Metric>("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<PrototypeAction>(null);

  const towns = useMemo(() => Array.from(new Set(MOCK_ROLLUPS.map((r) => r.cityTown))), []);
  const ldsForTown = useMemo(
    () =>
      Array.from(new Set(MOCK_ROLLUPS.filter((r) => !town || r.cityTown === town).map((r) => r.legDistrict))).sort(
        (a, b) => a - b,
      ),
    [town],
  );

  // Scope = town/LD/search; the metric cards summarize the scope and then
  // narrow it further, so the numbers on the cards stay stable as you click.
  const scoped = useMemo(
    () =>
      MOCK_ROLLUPS.filter(
        (r) =>
          (!town || r.cityTown === town) &&
          (!ld || r.legDistrict === Number(ld)) &&
          (!query ||
            String(r.electionDistrict) === query.trim() ||
            capitalize(r.cityTown).toLowerCase().includes(query.toLowerCase())),
      ),
    [town, ld, query],
  );
  const summary = useMemo(() => summarize(scoped), [scoped]);
  const counts = useMemo(
    () => ({
      missingWeight: scoped.filter((r) => matchesMetric(r, "missingWeight")).length,
      vacantEds: scoped.filter((r) => matchesMetric(r, "vacant")).length,
      pendingEds: scoped.filter((r) => matchesMetric(r, "pending")).length,
      unassignedEds: scoped.filter((r) => matchesMetric(r, "unassigned")).length,
      fullEds: scoped.filter((r) => matchesMetric(r, "full")).length,
    }),
    [scoped],
  );
  const visible = useMemo(() => scoped.filter((r) => matchesMetric(r, metric)), [scoped, metric]);

  // Group key: town, plus LD when the town spans several LDs.
  const groups = useMemo(() => {
    const multiLdTowns = new Set(
      towns.filter((t) => new Set(MOCK_ROLLUPS.filter((r) => r.cityTown === t).map((r) => r.legDistrict)).size > 1),
    );
    const m = new Map<string, { key: string; town: string; ld: number | null; rows: EdRollup[] }>();
    for (const r of visible) {
      const multi = multiLdTowns.has(r.cityTown);
      const key = multi ? `${r.cityTown}/${r.legDistrict}` : r.cityTown;
      if (!m.has(key)) m.set(key, { key, town: r.cityTown, ld: multi ? r.legDistrict : null, rows: [] });
      m.get(key)!.rows.push(r);
    }
    return Array.from(m.values());
  }, [visible, towns]);

  // Expanded committee: URL wins; nothing expanded by default.
  const expanded = MOCK_BY_ID.get(committeeParam) ?? null;
  const expandedId = expanded?.rollup.committeeListId ?? null;
  const expandedGroupKey = useMemo(() => {
    if (!expanded) return null;
    return groups.find((g) => g.rows.some((r) => r.committeeListId === expandedId))?.key ?? null;
  }, [groups, expanded, expandedId]);

  const toggle = (r: EdRollup) =>
    setParams({ committee: r.committeeListId === expandedId ? null : String(r.committeeListId) }, "push");

  const toggleGroup = (key: string) =>
    setCollapsedGroups((s) => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const stub = (what: string) =>
    toast({ title: `${what} (stubbed)`, description: "Prototype: nothing was changed." });

  // On load / when the URL selects a committee: un-collapse its group and
  // scroll the row into view.
  const expandedRef = useRef<HTMLLIElement>(null);
  const scrolledFor = useRef<number | null>(null);
  useEffect(() => {
    if (expandedId === null) {
      scrolledFor.current = null;
      return;
    }
    if (expandedGroupKey && collapsedGroups.has(expandedGroupKey)) {
      setCollapsedGroups((s) => {
        const n = new Set(s);
        n.delete(expandedGroupKey);
        return n;
      });
      return; // re-run after the group renders
    }
    if (scrolledFor.current === expandedId) return;
    scrolledFor.current = expandedId;
    expandedRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [expandedId, expandedGroupKey, collapsedGroups]);

  const cards: Array<{ key: Metric; label: string; value: string; sub?: string; warn?: boolean }> = [
    { key: "all", label: "Committees", value: String(summary.edCount), sub: `${towns.length} towns` },
    {
      key: "full",
      label: "Seats filled",
      value: `${summary.filled}/${summary.totalSeats}`,
      sub: `${counts.fullEds} full ED${counts.fullEds === 1 ? "" : "s"}`,
    },
    {
      key: "vacant",
      label: "Open seats",
      value: String(summary.vacant),
      sub: `in ${counts.vacantEds} ED${counts.vacantEds === 1 ? "" : "s"}`,
    },
    {
      key: "missingWeight",
      label: "Missing weight",
      value: String(counts.missingWeight),
      sub: counts.missingWeight ? "EDs blocked" : "all set",
      warn: counts.missingWeight > 0,
    },
    {
      key: "pending",
      label: "Pending",
      value: String(summary.pendingCount),
      sub: `in ${counts.pendingEds} ED${counts.pendingEds === 1 ? "" : "s"}`,
      warn: summary.pendingCount > 0,
    },
    {
      key: "unassigned",
      label: "Unassigned",
      value: String(summary.unassignedCount),
      sub: "seatless members",
    },
  ];

  // ------------------------------------------------------------------------
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16">
      {/* Workspace header */}
      <header className="flex flex-wrap items-end justify-between gap-2 py-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight">Committees</h1>
          <p className="text-xs text-slate-500">
            {TERM.label} term · {summary.activeMemberCount} active members
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

      {/* Metric cards — clickable filters */}
      <section aria-label="Summary" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => {
          const on = metric === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setMetric(on && c.key !== "all" ? "all" : c.key)}
              aria-pressed={on}
              className={`rounded-lg border p-3 text-left transition-colors ${
                on
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                  : "bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900"
              }`}
            >
              <div className={`text-[11px] uppercase tracking-wide ${on ? "opacity-80" : "text-slate-500"}`}>
                {c.label}
              </div>
              <div
                className={`text-2xl font-semibold tabular-nums leading-tight ${
                  c.warn && !on ? "text-amber-700 dark:text-amber-400" : ""
                }`}
              >
                {c.value}
              </div>
              {c.sub && <div className={`text-xs ${on ? "opacity-80" : "text-slate-500"}`}>{c.sub}</div>}
            </button>
          );
        })}
      </section>

      {/* Scope controls */}
      <div className="sticky top-0 z-20 -mx-4 mt-3 flex flex-wrap items-center gap-2 border-b bg-white/95 px-4 py-2 backdrop-blur dark:bg-slate-950/95">
        <select
          className="h-9 min-w-0 flex-1 rounded-md border bg-white px-2 text-sm sm:flex-none sm:w-44 dark:bg-slate-950"
          value={town}
          onChange={(e) => setParams({ town: e.target.value, ld: null, committee: null })}
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
          onChange={(e) => setParams({ ld: e.target.value, committee: null })}
        >
          <option value="">All LDs</option>
          {ldsForTown.map((n) => (
            <option key={n} value={n}>
              LD {n}
            </option>
          ))}
        </select>
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            className="h-9 pl-8"
            placeholder="ED number or town"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {metric !== "all" && (
          <button
            onClick={() => setMetric("all")}
            className="inline-flex items-center gap-1 rounded-full border border-slate-900 bg-slate-900 px-2 py-0.5 text-xs text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
          >
            {cards.find((c) => c.key === metric)?.label}
            <X className="h-3 w-3" />
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">
          {visible.length} of {scoped.length} ED{scoped.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Groups */}
      {groups.length === 0 && (
        <div className="p-10 text-center text-sm text-slate-500">No committees match.</div>
      )}
      <div className="mt-3 space-y-3">
        {groups.map((g) => {
          const collapsed = collapsedGroups.has(g.key);
          const gs = summarize(g.rows);
          const gMissing = g.rows.filter((r) => r.missingWeightSeatNumbers.length > 0).length;
          const containsExpanded = g.key === expandedGroupKey;
          return (
            <section
              key={g.key}
              className={`rounded-lg border ${containsExpanded ? "border-blue-300 dark:border-blue-800" : ""}`}
            >
              <button
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-t-lg bg-slate-50 px-3 py-2 text-left dark:bg-slate-900"
                onClick={() => toggleGroup(g.key)}
                aria-expanded={!collapsed}
              >
                <span className="flex items-center gap-1 text-sm font-semibold">
                  {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {capitalize(g.town)}
                  {g.ld !== null && <span className="ml-1 font-normal text-slate-500">LD {g.ld}</span>}
                </span>
                <span className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                  <span className="rounded bg-white px-1.5 py-0.5 dark:bg-slate-950">{gs.edCount} EDs</span>
                  <span className="rounded bg-white px-1.5 py-0.5 tabular-nums dark:bg-slate-950">
                    {gs.filled}/{gs.totalSeats} seats
                  </span>
                  {gs.vacant > 0 && (
                    <span className="rounded bg-white px-1.5 py-0.5 dark:bg-slate-950">{gs.vacant} open</span>
                  )}
                  {gs.pendingCount > 0 && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                      {gs.pendingCount} pending
                    </span>
                  )}
                  {gMissing > 0 && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                      {gMissing} missing weight
                    </span>
                  )}
                </span>
                <span className="ml-auto hidden sm:block">
                  <FillBar filled={gs.filled} total={gs.totalSeats} />
                </span>
              </button>

              {!collapsed && (
                <ul>
                  {g.rows.map((r) => {
                    const isSel = r.committeeListId === expandedId;
                    const open = r.totalSeats - r.filled;
                    return (
                      <li
                        key={r.committeeListId}
                        ref={isSel ? expandedRef : undefined}
                        className="scroll-mt-16 border-t border-slate-100 dark:border-slate-800"
                      >
                        <button
                          onClick={() => toggle(r)}
                          aria-expanded={isSel}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-900 ${
                            isSel ? "bg-blue-50 dark:bg-blue-950" : ""
                          }`}
                        >
                          {isSel ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-blue-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                          )}
                          <span className="w-14 shrink-0 font-medium">ED {r.electionDistrict}</span>
                          <SeatDots filled={r.filled} total={r.totalSeats} />
                          <span
                            className={`w-9 shrink-0 tabular-nums ${
                              open ? "text-slate-700 dark:text-slate-200" : "text-slate-400"
                            }`}
                          >
                            {r.filled}/{r.totalSeats}
                          </span>
                          <span className="ml-auto flex shrink-0 items-center gap-1">
                            {r.pendingCount > 0 && (
                              <span
                                className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 text-xs text-amber-900 dark:bg-amber-900 dark:text-amber-100"
                                title={`${r.pendingCount} pending`}
                              >
                                <Clock className="h-3 w-3" />
                                {r.pendingCount}
                              </span>
                            )}
                            {r.missingWeightSeatNumbers.length > 0 && (
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-label="Missing weight" />
                            )}
                            {r.unassignedCount > 0 && (
                              <span className="rounded border px-1 text-[10px] text-slate-500" title="Unassigned member">
                                +{r.unassignedCount}
                              </span>
                            )}
                          </span>
                        </button>

                        {isSel && expanded && (
                          <ExpandedDetail
                            detail={expanded.detail}
                            tab={tab}
                            onTab={(t) => setParams({ tab: t })}
                            onClose={() => setParams({ committee: null }, "push")}
                            isAdmin={isAdmin}
                            canAct={canAct}
                            onAction={setAction}
                            stub={stub}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <AddMemberDrawerStub action={action} role={actingPermissions} onClose={() => setAction(null)} />
    </div>
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

function FillBar({ filled, total }: { filled: number; total: number }) {
  const pct = total ? Math.round((filled / total) * 100) : 0;
  return (
    <span className="flex items-center gap-2 text-xs text-slate-500" title={`${pct}% filled`}>
      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden>
        <span className="block h-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-8 tabular-nums">{pct}%</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Inline (accordion) detail region — the thing Variant C is evaluating.

function ExpandedDetail({
  detail,
  tab,
  onTab,
  onClose,
  isAdmin,
  canAct,
  onAction,
  stub,
}: {
  detail: CommitteeDetailResponse;
  tab: Tab;
  onTab: (t: Tab) => void;
  onClose: () => void;
  isAdmin: boolean;
  canAct: boolean;
  onAction: (a: PrototypeAction) => void;
  stub: (what: string) => void;
}) {
  const { committee: c, rollup, rows, pending, designationWeightSummary: dw, history } = detail;
  const open = rollup.totalSeats - rollup.filled;
  const addLabel = isAdmin ? "Add member" : "Submit candidate";
  const firstOccupied = rows.find((r) => r.occupant);

  return (
    <div className="border-t border-blue-200 bg-white shadow-[inset_3px_0_0_0_#2563eb] dark:border-blue-900 dark:bg-slate-950">
      {/* Context + action bar — actions stay with the selected committee */}
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight">
            {capitalize(c.cityTown)} · LD {c.legDistrict} · ED {c.electionDistrict}
          </h2>
          <p className="text-xs text-slate-500">
            {rollup.filled} of {rollup.totalSeats} seats filled
            {rollup.unassignedCount > 0 && ` · ${rollup.unassignedCount} unassigned`}
            {c.ltedWeight ? ` · LTED weight ${c.ltedWeight}` : " · LTED weight not set"}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {open > 0 ? <Badge variant="outline">{open} open</Badge> : <Badge variant="secondary">Full</Badge>}
            {rollup.pendingCount > 0 && (
              <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-100">
                {rollup.pendingCount} pending
              </Badge>
            )}
            {rollup.missingWeightSeatNumbers.length > 0 && (
              <Badge variant="destructive">Weight missing: seat {rollup.missingWeightSeatNumbers.join(", ")}</Badge>
            )}
          </div>
        </div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900" title="Collapse">
          <X className="h-4 w-4" />
        </button>
      </div>

      {canAct && (
        <div className="flex flex-wrap gap-1 border-y bg-slate-50 px-4 py-2 dark:bg-slate-900">
          <Button size="sm" className="h-8" onClick={() => onAction({ kind: "add-member", committee: rollup })}>
            <Plus className="mr-1 h-4 w-4" /> {addLabel}
          </Button>
          {!isAdmin && firstOccupied?.occupant && (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() =>
                onAction({
                  kind: "add-member",
                  committee: rollup,
                  seatNumber: firstOccupied.seatNumber ?? undefined,
                  replacingName: `${firstOccupied.occupant!.firstName} ${firstOccupied.occupant!.lastName}`,
                })
              }
            >
              Replace member
            </Button>
          )}
          {isAdmin && (
            <>
              <Button size="sm" variant="outline" className="h-8" onClick={() => stub("Record resignation")}>
                <UserMinus className="mr-1 h-4 w-4" /> Resign
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-red-700" onClick={() => stub("Remove member")}>
                Remove
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => stub("Edit weights")}>
                <Scale className="mr-1 h-4 w-4" /> Edit weights
              </Button>
            </>
          )}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => onTab(v as Tab)}>
        <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b bg-transparent p-0 px-2">
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

        <div className="max-h-[60vh] overflow-y-auto">
          {/* Roster */}
          <TabsContent value="roster" className="m-0 p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr className="border-b">
                  <th className="px-4 py-2 font-medium">Seat</th>
                  <th className="px-2 py-2 font-medium">Member</th>
                  <th className="hidden px-2 py-2 font-medium sm:table-cell">Type</th>
                  <th className="hidden px-2 py-2 text-right font-medium md:table-cell">Weight</th>
                  {isAdmin && <th className="hidden px-2 py-2 font-medium lg:table-cell">Contact</th>}
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.seatNumber ?? `u-${r.occupant?.VRCNUM}`} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-2 align-top">
                      {r.seatNumber === null ? <span className="text-slate-500">—</span> : <span className="font-medium">{r.seatNumber}</span>}
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
                    <td className="px-2 py-2 text-right align-top">
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
          <TabsContent value="pending" className="m-0 space-y-2 p-4">
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
          <TabsContent value="seats" className="m-0 space-y-4 p-4 text-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="LTED weight" value={c.ltedWeight ?? "Not set"} warn={!c.ltedWeight} />
              <Stat
                label="Designation weight"
                value={dw.missingWeightSeatNumbers.length ? "Incomplete" : dw.totalWeight.toFixed(2)}
                warn={dw.missingWeightSeatNumbers.length > 0}
              />
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
                    <td className="py-1.5">
                      {s.isOccupied ? capitalize(s.occupantMembershipType ?? "") : <span className="text-slate-400">Vacant</span>}
                    </td>
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
                    <td className="py-1.5 text-right tabular-nums">
                      {s.contributes ? s.contributionWeight.toFixed(2) : <span className="text-slate-300">0</span>}
                    </td>
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
          <TabsContent value="history" className="m-0 p-4">
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
        </div>
      </Tabs>
    </div>
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
