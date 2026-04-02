import * as React from "react";

/* Example usage:
  //-- Polling Order Status every 5 seconds
  const { data: status } = useAsyncPolling(
    () => api.order.getStatus(orderId),
    5000,          
    [orderId]
  );
  
  //-- Polling Queue Info every 2 seconds (Background Workers)
  const queue = useAsyncPolling(
    () => api.queue.getInfo(),
    2000,
    []
  );
*/
export function useAsyncPolling<T>(
  asyncFn: () => Promise<T>,
  interval: number,
  deps: React.DependencyList = []
) {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<any>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function tick() {
      setLoading(true);
      setError(null);

      try {
        const result = await asyncFn();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    tick(); // run immediately
    const id = setInterval(tick, interval);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, deps);

  return { data, loading, error };
}
