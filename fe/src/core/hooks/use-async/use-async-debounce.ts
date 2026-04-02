import * as React from "react";

/*  Example usage:

  const { data: results, loading } = useAsyncDebounce(
    () => api.search(keyword),
    300,
    [keyword]
  );

  <TextField 
    label="Search"
    value={keyword}
    onChange={(e) => setKeyword(e.target.value)}
  />

  <SearchResults items={results ?? []} loading={loading} />
*/
export function useAsyncDebounce<T>(
  asyncFn: () => Promise<T>,
  delay: number,
  deps: React.DependencyList = []
) {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<any>(null);

  React.useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
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
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, deps);

  return { data, loading, error };
}
