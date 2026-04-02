import { useCallback, useEffect, useMemo, useRef } from "react";

type DebouncedFn<T extends (...args: any[]) => void> = ((...args: Parameters<T>) => void) & {
  clear: () => void;
};

export function useDebounce<T extends (...args: any[]) => void>(
  fn: T,
  delay = 300
): DebouncedFn<T> {
  const fnRef = useRef(fn);
  const delayRef = useRef(delay);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    delayRef.current = delay;
  }, [delay]);

  const clear = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      clear();
      timerRef.current = setTimeout(() => {
        fnRef.current(...args);
      }, delayRef.current);
    },
    [clear]
  );

  useEffect(() => clear, [clear]);

  return useMemo(
    () => Object.assign(debounced, { clear }),
    [debounced, clear]
  ) as DebouncedFn<T>;
}
