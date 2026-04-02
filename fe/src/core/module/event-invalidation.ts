import * as React from "react";
import { on, off, emit, emitAsync } from "@core/module/event-bus";

type Opts<T> = {
  fetcher: () => Promise<T>;
  invalidateEvent: string;
  initial?: T | null;
  errorText?: string;
};

export function invalidate(event: string, payload?: unknown) {
  return emit(event, payload);
}

export async function invalidateAsync<T, K>(event: string, payload?: T | undefined) {
  return await emitAsync<T, K>(event, payload);
}

export function useEventInvalidation<T>({
  fetcher,
  invalidateEvent,
  initial = null,
  errorText = "Không thể tải dữ liệu",
}: Opts<T>) {
  const [data, setData] = React.useState<T | null>(initial);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetcherRef = React.useRef(fetcher);
  React.useEffect(() => { fetcherRef.current = fetcher; }, [fetcher]);

  // load ổn định: deps = []
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcherRef.current();
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? errorText);
    } finally {
      setLoading(false);
    }
  }, [errorText]);

  // chạy 1 lần khi mount
  React.useEffect(() => { void load(); }, [load]);

  React.useEffect(() => {
    const h = () => { void load(); };
    on(invalidateEvent, h);
    return () => off(invalidateEvent, h);
  }, [invalidateEvent, load]);

  return { data, setData, loading, error, reload: load };
}
