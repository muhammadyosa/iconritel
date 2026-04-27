import { useEffect, useRef, useCallback } from "react";

/**
 * Returns a stable debounced version of `callback`.
 * Repeated calls within `delay` ms collapse into a single invocation.
 *
 * Useful for coalescing realtime refetches: if 10 postgres_changes events
 * arrive in a burst, we only refetch once instead of 10 times.
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay = 250
) {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debounced = useCallback(
    (...args: TArgs) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => cancel(), [cancel]);

  return { debounced, cancel };
}
