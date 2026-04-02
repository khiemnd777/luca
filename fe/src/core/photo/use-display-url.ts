import * as React from "react";
import { downloadPhotoWithMeta } from "@core/photo/download-photo.api";
import { bytesToBlobUrl } from "@shared/utils/file.utils";
import type { PhotoSize } from "@core/photo/photo.types";

type CacheEntry = { url: string; at: number };
const URL_CACHE = new Map<string, CacheEntry>(); // key: photoId|size
const INFLIGHT = new Map<string, Promise<string>>(); // tránh fetch trùng
const MAX_CACHE = 200;
const TTL_MS = 5 * 60 * 1000;

function cacheKey(id: string, size: PhotoSize) {
  return `${size}:${id}`;
}
function getCache(k: string): string | undefined {
  const e = URL_CACHE.get(k);
  if (!e) return;
  if (Date.now() - e.at > TTL_MS) {
    safeRevoke(e.url);
    URL_CACHE.delete(k);
    return;
  }
  // LRU: move-to-end
  URL_CACHE.delete(k);
  URL_CACHE.set(k, { url: e.url, at: Date.now() });
  return e.url;
}
function setCache(k: string, url: string) {
  if (URL_CACHE.has(k)) {
    const old = URL_CACHE.get(k)!;
    if (old.url !== url) safeRevoke(old.url);
    URL_CACHE.delete(k);
  }
  URL_CACHE.set(k, { url, at: Date.now() });
  while (URL_CACHE.size > MAX_CACHE) {
    const [firstKey, firstVal] = URL_CACHE.entries().next().value as [string, CacheEntry];
    safeRevoke(firstVal.url);
    URL_CACHE.delete(firstKey);
  }
}
function safeRevoke(url: string) {
  try {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  } catch { }
}

function isDirectUrl(src?: string | null) {
  return !!src && (src.startsWith("blob:") || src.startsWith("data:") || src.startsWith("http"));
}

export type UseDisplayUrlOptions = {
  size?: PhotoSize;
  onlyUpdateWhenChanged?: boolean;
  keepPrevious?: boolean;
};

export function useDisplayUrl(src?: string | null, opts?: UseDisplayUrlOptions) {
  const { size = "thumbnail", onlyUpdateWhenChanged = true, keepPrevious = true } = opts ?? {};
  const prevRef = React.useRef<string | undefined>(undefined);
  const [displayUrl, setDisplayUrl] = React.useState<string | undefined>(() => {
    if (!src) return undefined;
    if (isDirectUrl(src)) return src;
    const k = cacheKey(src, size);
    return getCache(k) ?? undefined;
  });

  // luôn giữ "giá trị trước đó" để tránh nháy (never go to `undefined`)
  if (keepPrevious && prevRef.current === undefined && displayUrl !== undefined) {
    prevRef.current = displayUrl;
  }

  React.useEffect(() => {
    let active = true;

    async function run() {
      if (!src) {
        // chỉ clear nếu thật sự không có gì để hiển thị
        if (!keepPrevious) setDisplayUrl(undefined);
        return;
      }

      // URL trực tiếp -> gắn ngay, không revoke
      if (isDirectUrl(src)) {
        if (active) {
          if (!onlyUpdateWhenChanged || displayUrl !== src) {
            setDisplayUrl(src);
            prevRef.current = src;
          }
        }
        return;
      }

      const k = cacheKey(src, size);
      // 1) nếu có cache -> gắn ngay (không nháy)
      const cached = getCache(k);
      if (cached && active) {
        if (!onlyUpdateWhenChanged || displayUrl !== cached) {
          setDisplayUrl(cached);
          prevRef.current = cached;
        }
      }

      // 2) tránh fetch trùng
      let p = INFLIGHT.get(k);
      if (!p) {
        p = (async () => {
          const { bytes, contentType } = await downloadPhotoWithMeta(src, size);
          return bytesToBlobUrl(bytes, contentType);
        })().finally(() => {
          INFLIGHT.delete(k);
        });
        INFLIGHT.set(k, p);
      }

      try {
        const blobUrl = await p;
        if (!active) return;
        setCache(k, blobUrl);
        if (!onlyUpdateWhenChanged || displayUrl !== blobUrl) {
          setDisplayUrl(blobUrl);
          prevRef.current = blobUrl;
        }
      } catch {
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [src, size]);

  return displayUrl ?? prevRef.current;
}
