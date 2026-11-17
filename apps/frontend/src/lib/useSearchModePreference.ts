import { useCallback, useEffect, useState } from "react";

export type SearchMode = "simple" | "advanced";

export const SEARCH_MODE_STORAGE_KEY = "recordSearch.mode";

/** The mode this browser last used, or null when storage is empty, invalid, or blocked. */
const readStoredMode = (): SearchMode | null => {
  try {
    const stored = window.localStorage.getItem(SEARCH_MODE_STORAGE_KEY);
    return stored === "simple" || stored === "advanced" ? stored : null;
  } catch {
    return null;
  }
};

/**
 * The Record Search mode this browser last used. `ready` stays false until storage
 * has been read, so the form is not shown until that mode is known. A new
 * browser, or one where storage is blocked, is simple.
 */
export const useSearchModePreference = () => {
  const [mode, setModeState] = useState<SearchMode>("simple");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredMode();
    if (stored) setModeState(stored);
    setReady(true);
  }, []);

  const setMode = useCallback((next: SearchMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(SEARCH_MODE_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode, blocked site data): keep in-memory only.
    }
  }, []);

  return { mode, setMode, ready };
};
