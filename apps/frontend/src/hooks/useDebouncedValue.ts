import { useState, useEffect } from "react";
import { DEBOUNCE_DELAY_MS } from "~/lib/constants/debounce";

/**
 * Hook that debounces a value with a configurable delay.
 * Returns the debounced value that updates after the specified delay.
 */
export function useDebouncedValue<T>(
  value: T,
  delay: number = DEBOUNCE_DELAY_MS,
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
