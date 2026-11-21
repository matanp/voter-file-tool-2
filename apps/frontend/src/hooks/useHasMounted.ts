import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/**
 * False during server rendering and hydration, true afterwards. Use it to hold back output that
 * depends on the browser (time zone, locale, clock) so the first client render matches the
 * server HTML.
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
