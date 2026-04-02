import * as React from "react";

/*
* Example usage:
*   const action = useAsyncManual(() => api.updateOrder(id, form));
*   await action.run();
*/
export function useAsyncManual<T>(
  asyncFn: () => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (err: any) => void;
  }
) {
  const { onSuccess, onError } = options ?? {};
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<any>(null);
  const [data, setData] = React.useState<T | null>(null);

  const run = React.useCallback(async () => {
    setLoading(false);
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
  }, [asyncFn]);

  return { data, loading, error, run, setData };
}
