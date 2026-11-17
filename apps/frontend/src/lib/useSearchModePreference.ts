import { useCallback, useEffect, useState } from "react";

export type SearchMode = "simple" | "advanced";

export const SEARCH_MODE_STORAGE_KEY = "recordSearch.mode";

const readStoredMode = (): SearchMode | null => {
  try {
    const stored = window.localStorage.getItem(SEARCH_MODE_STORAGE_KEY);
    return stored === "simple" || stored === "advanced" ? stored : null;
  } catch {
    return null;
  }
};

/**
 * The Record Search mode this browser last used. Starts as "simple" (also on
 * the server) and switches to the stored preference after mount.
 */
export const useSearchModePreference = () => {
  const [mode, setModeState] = useState<SearchMode>("simple");

  useEffect(() => {
    const stored = readStoredMode();
    if (stored) setModeState(stored);
  }, []);

  const setMode = useCallback((next: SearchMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(SEARCH_MODE_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode, blocked site data): keep in-memory only.
    }
  }, []);

  return { mode, setMode };
};
