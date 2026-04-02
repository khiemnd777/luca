import * as React from "react";
import { apiClient } from "@core/network/api-client";
import { bytesToBlobUrl } from "@shared/utils/file.utils";

type CacheEntry = {
  url: string;
  at: number;
};

const URL_CACHE = new Map<string, CacheEntry>();
const INFLIGHT = new Map<string, Promise<string>>();
const MAX_CACHE = 100;
const TTL_MS = 5 * 60 * 1000;

function getCache(key: string): string | undefined {
  const entry = URL_CACHE.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > TTL_MS) {
    safeRevoke(entry.url);
    URL_CACHE.delete(key);
    return undefined;
  }

  URL_CACHE.delete(key);
  URL_CACHE.set(key, { url: entry.url, at: Date.now() });
  return entry.url;
}

function setCache(key: string, url: string) {
  const existing = URL_CACHE.get(key);
  if (existing && existing.url !== url) {
    safeRevoke(existing.url);
  }

  URL_CACHE.delete(key);
  URL_CACHE.set(key, { url, at: Date.now() });

  while (URL_CACHE.size > MAX_CACHE) {
    const [firstKey, firstValue] = URL_CACHE.entries().next().value as [string, CacheEntry];
    safeRevoke(firstValue.url);
    URL_CACHE.delete(firstKey);
  }
}

function safeRevoke(url: string) {
  try {
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  } catch {
    // ignore revoke failures
  }
}

function isDirectBrowserUrl(src?: string | null) {
  return !!src && (
    src.startsWith("blob:") ||
    src.startsWith("data:") ||
    src.startsWith("http://") ||
    src.startsWith("https://")
  );
}

export function usePhotoUrl(src?: string | null) {
  const [displayUrl, setDisplayUrl] = React.useState<string | undefined>(() => {
    if (!src) return undefined;
    if (isDirectBrowserUrl(src)) return src;
    return getCache(src);
  });
  const [loading, setLoading] = React.useState<boolean>(Boolean(src && !isDirectBrowserUrl(src) && !getCache(src)));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    async function load() {
      if (!src) {
        if (active) {
          setDisplayUrl(undefined);
          setLoading(false);
          setError(null);
        }
        return;
      }

      if (isDirectBrowserUrl(src)) {
        if (active) {
          setDisplayUrl(src);
          setLoading(false);
          setError(null);
        }
        return;
      }

      const cached = getCache(src);
      if (cached) {
        if (active) {
          setDisplayUrl(cached);
          setLoading(false);
          setError(null);
        }
        return;
      }

      setLoading(true);
      setError(null);

      let request = INFLIGHT.get(src);
      if (!request) {
        request = apiClient.get<ArrayBuffer>(src, {
          responseType: "arraybuffer",
          timeout: 30_000,
        }).then((response) => {
          const contentType =
            (response.headers["content-type"] as string | undefined) ??
            (response.headers["Content-Type"] as string | undefined) ??
            "image/jpeg";
          return bytesToBlobUrl(new Uint8Array(response.data), contentType);
        }).finally(() => {
          INFLIGHT.delete(src);
        });
        INFLIGHT.set(src, request);
      }

      try {
        const blobUrl = await request;
        if (!active) return;
        setCache(src, blobUrl);
        setDisplayUrl(blobUrl);
        setLoading(false);
      } catch {
        if (!active) return;
        setDisplayUrl(undefined);
        setLoading(false);
        setError("Không thể tải ảnh xác nhận.");
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [src]);

  return {
    displayUrl,
    loading,
    error,
  };
}
