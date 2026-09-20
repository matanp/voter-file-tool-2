"use client";
/**
 * PROTOTYPE — Variant A: split pane (plan §4). Grid left, tabbed detail right,
 * contextual action drawer. Below `md` the grid and detail are consecutive
 * full-screen views (Variant B's navigation), which is the expected outcome.
 *
 * Read-only against `mockData.ts`; every mutation is a toast.
 */
import React, { useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PrivilegeLevel } from "@prisma/client";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
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

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function VariantA() {
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
    p.set("variant", "A");
    router[mode](`${pathname}?${p.toString()}`, { scroll: false });
  };

  // --- Local-only filters -------------------------------------------------
  const [query, setQuery] = useState("");
  const [onlyVacant, setOnlyVacant] = useState(false);
  const [onlyPending, setOnlyPending] = useState(false);
  const [onlyMissingWeight, setOnlyMissingWeight] = useState(false);
  const [collapsedTowns, setCollapsedTowns] = useState<Set<string>>(new Set());
  const [gridCollapsed, setGridCollapsed] = useState(false);
  const [action, setAction] = useState<PrototypeAction>(null);

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
  const summary = useMemo(() => summarize(visible), [visible]);
  const grouped = useMemo(() => {
    const m = new Map<string, EdRollup[]>();
    for (const r of visible) {
      const k = r.cityTown;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return Array.from(m.entries());
  }, [visible]);

  // Selection: URL wins; else first visible on desktop; on mobile, list first.
  const selected = MOCK_BY_ID.get(committeeParam) ?? null;
  const fallback = visible[0] ? MOCK_BY_ID.get(visible[0].committeeListId)! : null;
  const detail = selected ?? fallback;
  const mobileShowingDetail = selected !== null;

  const select = (r: EdRollup) => setParams({ committee: String(r.committeeListId) }, "push");

  const stub = (what: string) =>
    toast({ title: `${what} (stubbed)`, description: "Prototype: nothing was changed." });

  // The app header has no fixed height; measure it so the panes can fill the
  // rest of the viewport and scroll independently.
  const [navH, setNavH] = useState(64);
  useEffect(() => {
    const measure = () => setNavH(document.querySelector("nav")?.getBoundingClientRect().height ?? 64);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ------------------------------------------------------------------------
  return (
    <div className="flex w-full flex-col overflow-hidden" style={{ height: `calc(100dvh - ${navH}px)` }}>
      {/* Workspace header */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-tight">Committees</h1>
          <p className="truncate text-xs text-slate-500">
            {TERM.label} · {summary.edCount} EDs · {summary.vacant} open seats · {summary.pendingCount} pending
            {summary.unassignedCount > 0 && ` · ${summary.unassignedCount} unassigned`}
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

      <div className="flex min-h-0 flex-1">
        {/* Grid pane */}
        <aside
          className={`${mobileShowingDetail ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r transition-[width] ${
            gridCollapsed ? "md:w-12" : "w-full md:w-[38%] md:min-w-[320px] md:max-w-[460px]"
          }`}
        >
          {gridCollapsed ? (
            <button
              className="hidden h-full w-full items-start justify-center pt-3 text-slate-500 hover:bg-slate-50 md:flex dark:hover:bg-slate-900"
              onClick={() => setGridCollapsed(false)}
              title="Show committee list"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>
          ) : (
            <>
              <div className="space-y-2 border-b p-3">
                <div className="flex gap-2">
                  <select
                    className="h-9 min-w-0 flex-1 rounded-md border bg-white px-2 text-sm dark:bg-slate-950"
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
                  <button
                    className="hidden shrink-0 rounded-md border px-2 text-slate-500 hover:bg-slate-50 md:block dark:hover:bg-slate-900"
                    onClick={() => setGridCollapsed(true)}
                    title="Hide committee list"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative">
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
                      className={`rounded-full border px-2 py-0.5 ${
                        on
                          ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                          : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {grouped.length === 0 && (
                  <div className="p-6 text-center text-sm text-slate-500">No committees match.</div>
                )}
                {grouped.map(([townName, rows]) => {
                  const collapsed = collapsedTowns.has(townName);
                  const ts = summarize(rows);
                  const multiLd = new Set(rows.map((r) => r.legDistrict)).size > 1;
                  return (
                    <section key={townName}>
                      <button
                        className="sticky top-0 z-10 flex w-full items-center justify-between border-b bg-slate-50 px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                        onClick={() =>
                          setCollapsedTowns((s) => {
                            const n = new Set(s);
                            n.has(townName) ? n.delete(townName) : n.add(townName);
                            return n;
                          })
                        }
                      >
                        <span className="flex items-center gap-1">
                          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {capitalize(townName)}
                        </span>
                        <span className="font-normal normal-case text-slate-500">
                          {ts.edCount} EDs · {ts.vacant} open{ts.pendingCount ? ` · ${ts.pendingCount} pending` : ""}
                        </span>
                      </button>
                      {!collapsed && (
                        <ul>
                          {rows.map((r) => {
                            const isSel = detail?.rollup.committeeListId === r.committeeListId;
                            const open = r.totalSeats - r.filled;
                            return (
                              <li key={r.committeeListId}>
                                <button
                                  onClick={() => select(r)}
                                  aria-current={isSel ? "true" : undefined}
                                  className={`flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 ${
                                    isSel ? "bg-blue-50 shadow-[inset_3px_0_0_0_#2563eb] dark:bg-blue-950" : ""
                                  }`}
                                >
                                  <span className="w-20 shrink-0 font-medium">
                                    ED {r.electionDistrict}
                                    {multiLd && <span className="ml-1 text-xs font-normal text-slate-500">LD {r.legDistrict}</span>}
                                  </span>
                                  <SeatDots filled={r.filled} total={r.totalSeats} />
                                  <span className={`w-9 shrink-0 tabular-nums ${open ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}`}>
                                    {r.filled}/{r.totalSeats}
                                  </span>
                                  <span className="ml-auto flex shrink-0 items-center gap-1">
                                    {r.pendingCount > 0 && (
                                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 text-xs text-amber-900 dark:bg-amber-900 dark:text-amber-100" title={`${r.pendingCount} pending`}>
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
                                    <ChevronRight className="h-4 w-4 text-slate-300 md:hidden" />
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          )}
        </aside>

        {/* Detail pane */}
        <main className={`${mobileShowingDetail ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-1 flex-col`}>
          {!detail ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
              Select a committee.
            </div>
          ) : (
            <DetailPane
              detail={detail.detail}
              tab={tab}
              onTab={(t) => setParams({ tab: t })}
              onBack={() => setParams({ committee: null })}
              isAdmin={isAdmin}
              canAct={canAct}
              onAction={setAction}
              stub={stub}
            />
          )}
        </main>
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

// ---------------------------------------------------------------------------

function DetailPane({
  detail,
  tab,
  onTab,
  onBack,
  isAdmin,
  canAct,
  onAction,
  stub,
}: {
  detail: CommitteeDetailResponse;
  tab: Tab;
  onTab: (t: Tab) => void;
  onBack: () => void;
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
      {/* Context header — stays put while the tab scrolls */}
      <div className="border-b px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <button onClick={onBack} className="mb-1 flex items-center text-xs text-slate-500 md:hidden">
              <ChevronLeft className="h-4 w-4" /> Back to committees
            </button>
            <h2 className="truncate text-xl font-semibold leading-tight">
              {capitalize(c.cityTown)} · ED {c.electionDistrict}
            </h2>
            <p className="text-sm text-slate-500">
              LD {c.legDistrict} · {rollup.filled} of {rollup.totalSeats} seats filled
              {rollup.unassignedCount > 0 && ` · ${rollup.unassignedCount} unassigned`}
              {c.ltedWeight ? ` · LTED weight ${c.ltedWeight}` : " · LTED weight not set"}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
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
            </div>
          </div>
          {canAct && (
            <Button size="sm" className="shrink-0" onClick={() => onAction({ kind: "add-member", committee: rollup })}>
              <Plus className="mr-1 h-4 w-4" /> {addLabel}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => onTab(v as Tab)} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b bg-transparent p-0 px-2">
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

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Roster */}
          <TabsContent value="roster" className="m-0 p-0">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-xs uppercase text-slate-500 dark:bg-slate-950">
                <tr className="border-b">
                  <th className="px-4 py-2 font-medium">Seat</th>
                  <th className="px-2 py-2 font-medium">Member</th>
                  <th className="hidden px-2 py-2 font-medium sm:table-cell">Type</th>
                  <th className="hidden px-2 py-2 text-right font-medium lg:table-cell">Weight</th>
                  {isAdmin && <th className="hidden px-2 py-2 font-medium xl:table-cell">Contact</th>}
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.seatNumber ?? `u-${r.occupant?.VRCNUM}`} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-2 align-top">
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
                    <td className="hidden px-2 py-2 text-right align-top tabular-nums lg:table-cell">
                      {r.isPetitioned ? (
                        r.weight ?? <span className="text-amber-600" title="Missing weight">—</span>
                      ) : (
                        <span className="text-slate-300">n/a</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="hidden px-2 py-2 align-top text-xs text-slate-500 xl:table-cell">
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
