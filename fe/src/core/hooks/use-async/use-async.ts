import { emit, off, on } from "@core/module/event-bus";
import * as React from "react";

/*
* Example usage:
*   const { data, loading } = useAsync(() => api.getOrder(id), [id]);
*/
type Options<T> = {
  onSuccess?: (data: T) => void;
  onError?: (err: any) => void;
  key?: string;
  invalidateEvent?: string;
}

export function invalidate(key: string) {
  emit(`invalidate:${key}`);
}

export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList = [],
  options?: Options<T>,
) {
  const { onSuccess, onError, key, invalidateEvent } = options ?? {};

  const eventName =
    invalidateEvent ??
    (key ? `invalidate:${key}` : null);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<any>(null);
  const [data, setData] = React.useState<T | null>(null);

  const [version, bump] = React.useReducer(v => v + 1, 0);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      setError(err);
      onError?.(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, deps);

  // 👇 version nằm trong dependency
  React.useEffect(() => {
    void load();
  }, [load, version]);

  React.useEffect(() => {
    if (!eventName) return;

    const handler = () => {
      bump();
    };

    on(eventName, handler);
    return () => off(eventName, handler);
  }, [eventName]);

  return { data, loading, error, reload: load, setData };
}
