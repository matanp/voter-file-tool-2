/**
 * URL state for the committees workspace (plan §6 "URL State"):
 *
 *   /committees?committee=123&tab=roster&town=WHEATLAND&ld=3
 *
 * Pure helpers only: parsing tolerates junk (an invalid value reads as absent),
 * and `buildWorkspaceHref` applies a patch on top of the current params so
 * unrelated params survive every write.
 */

export const WORKSPACE_TABS = ["roster", "pending", "seats", "history"] as const;
export type WorkspaceTab = (typeof WORKSPACE_TABS)[number];
export const DEFAULT_WORKSPACE_TAB: WorkspaceTab = "roster";

export type WorkspaceUrlState = {
  /** `committeeListId`, or null when absent or not a positive integer. */
  committeeId: number | null;
  tab: WorkspaceTab;
  town: string | null;
  ld: number | null;
};

/** Patch for `buildWorkspaceHref`: null removes a param, undefined leaves it alone. */
export type WorkspaceUrlPatch = {
  committee?: number | null;
  tab?: WorkspaceTab | null;
  town?: string | null;
  ld?: number | null;
};

type ReadableParams = Pick<URLSearchParams, "get">;

function positiveInt(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return (WORKSPACE_TABS as readonly string[]).includes(value ?? "");
}

export function parseWorkspaceUrlState(
  params: ReadableParams | null,
): WorkspaceUrlState {
  const tab = params?.get("tab") ?? null;
  const town = params?.get("town")?.trim() ?? "";
  return {
    committeeId: positiveInt(params?.get("committee") ?? null),
    tab: isWorkspaceTab(tab) ? tab : DEFAULT_WORKSPACE_TAB,
    town: town === "" ? null : town,
    ld: positiveInt(params?.get("ld") ?? null),
  };
}

const PATCH_KEYS = ["committee", "tab", "town", "ld"] as const;

export function buildWorkspaceHref(
  pathname: string,
  current: URLSearchParams,
  patch: WorkspaceUrlPatch,
): string {
  const next = new URLSearchParams(current.toString());
  for (const key of PATCH_KEYS) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (value === undefined) continue;
    if (value === null || value === "") next.delete(key);
    else next.set(key, String(value));
  }
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}
