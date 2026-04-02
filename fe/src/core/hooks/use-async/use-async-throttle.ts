import * as React from "react";


/* Example usage:
  //-- Throttle Scroll-based Pagination
  const { data: moreItems } = useAsyncThrottle(
    () => api.feed.loadMore(cursor),
    1000,
    [cursor]
  );
  
  //-- Throttle Window Resize
  const size = useAsyncThrottle(
    () => getWindowSize(),
    500,
    [window.innerWidth, window.innerHeight]
  );
*/
export function useAsyncThrottle<T>(
  asyncFn: () => Promise<T>,
  delay: number,
  deps: React.DependencyList = []
) {
  const lastRunRef = React.useRef(0);

  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<any>(null);

  React.useEffect(() => {
    const now = Date.now();
    if (now - lastRunRef.current < delay) return;

    let cancelled = false;
    lastRunRef.current = now;

    (async () => {
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
    })();

    return () => {
      cancelled = true;
    };
  }, deps);

  return { data, loading, error };
}
