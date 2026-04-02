import * as React from "react";

/* Example usage:
  //-- Global profile fetching
  const { data: profile } = useAsyncResource(
    "profile",
    () => api.auth.me()
  );

  //-- Header avatar
  const { data: profile } = useAsyncResource(
    "profile",
    () => api.auth.me()
  );
  return <Avatar src={profile?.avatar} />;
  
  //-- Sidebar user name
  const { data: profile } = useAsyncResource(
    "profile",
    () => api.auth.me()
  );
  return <span>{profile?.name}</span>;

  //-- Invalidate / refresh profile resource
  invalidateResource("profile");
  refreshResource("profile");

  //-- Metadata collections
  const { data: metadata } = useAsyncResource(
    "metadata:collections",
    () => api.metadata.getCollections()
  );

  //-- Refreshing profile example
  function ProfileCard() {
    const { data, loading, error, refresh } = useAsyncResource(
      "profile",
      () => api.auth.me()
    );

    return (
      <>
        {loading && <Spinner />}
        {error && <div>Error</div>}
        {data && <Avatar src={data.avatar} />}

        <SafeButton onClick={refresh}>Refresh Profile</SafeButton>
      </>
    );
  }
*/

type ResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: any;
  promise: Promise<T> | null;
};

const resourceMap = new Map<string, ResourceState<any>>();
const listeners = new Set<() => void>();

function notifyAll() {
  listeners.forEach((l) => l());
}

export function invalidateResource(key: string) {
  resourceMap.delete(key);
  notifyAll();
}

export function refreshResource(key: string) {
  const res = resourceMap.get(key);
  if (!res) return;

  res.loading = true;
  res.promise = null;
  notifyAll();
}

export function useAsyncResource<T>(
  key: string,
  fetchFn: () => Promise<T>
) {
  // Force rerender for subscriptions
  const [, force] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);

  let res = resourceMap.get(key);

  if (!res) {
    res = {
      data: null,
      loading: true,
      error: null,
      promise: fetchFn(),
    };

    resourceMap.set(key, res);

    res.promise!.then(
      (d) => {
        res!.data = d;
        res!.loading = false;
        notifyAll();
      },
      (e) => {
        res!.error = e;
        res!.loading = false;
        notifyAll();
      }
    );
  }

  // If resource exists but was "refreshed"
  if (res.loading && !res.promise) {
    res.promise = fetchFn();

    res.promise.then(
      (d) => {
        res!.data = d;
        res!.loading = false;
        notifyAll();
      },
      (e) => {
        res!.error = e;
        res!.loading = false;
        notifyAll();
      }
    );
  }

  return {
    data: res.data as T | null,
    loading: res.loading,
    error: res.error,
    invalidate: () => invalidateResource(key),
    refresh: () => refreshResource(key),
  };
}
