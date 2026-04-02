import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { getRefreshToken } from "@core/network/token-utils";
import {
  bootstrapTokenSanity,
  ensureValidAccessToken,
  refreshOnce,
} from "@core/network/auth-session";
import type { FetchTableOpts } from "@core/table/table.types";
import { mapper } from "@core/mapper/auto-mapper";
import { getIdemKeyFor } from "@core/network/api-client.utils";
import { ApiServiceError } from "@core/network/api-error";
import type { SearchOpts } from "../types/search.types";

/** =========================
 *  Global (singleton + state)
 *  ========================= */
declare global {
  // eslint-disable-next-line no-var
  var __API_CLIENT_SINGLETON__: ApiClient | undefined;
}

/** =========================
 *  Bootstrap: dọn accessToken hết hạn
 *  ========================= */
bootstrapTokenSanity();

function isRefreshRequest(config?: AxiosRequestConfig | null) {
  const url = config?.url ?? "";
  return url.includes("/auth/refresh") || url.includes("/refresh-token");
}

/** =========================
 *  Response cache (memory + localStorage, đa tab)
 *  ========================= */

const CACHE_PREFIX = "__api_resp_v1__";
const DEFAULT_CACHE_TTL_MS = 30_000;

type CacheMode = "off" | "cache-first" | "stale-while-revalidate";

type StoredCacheEntry = {
  data: any;
  status: number;
  statusText: string;
  headers: Record<string, any>;
  expiresAt: number;
};

// per-tab memory cache
const MEMORY_CACHE = new Map<string, StoredCacheEntry>();

function nowMs() {
  return Date.now();
}

function safeLocalStorageGet(key: string): StoredCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCacheEntry;
    if (!parsed || typeof parsed.expiresAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: StoredCacheEntry) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${CACHE_PREFIX}:${key}`,
      JSON.stringify(value),
    );
  } catch {
    // quota exceeded / private mode -> ignore
  }
}

function safeLocalStorageRemove(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${CACHE_PREFIX}:${key}`);
  } catch {
    // ignore
  }
}

// Stable stringify dùng chung cho dedup + cache
function stableStringify(input: any): string {
  if (input === null || typeof input !== "object") return JSON.stringify(input);
  if (Array.isArray(input)) {
    return `[${input.map((x) => stableStringify(x)).join(",")}]`;
  }
  const keys = Object.keys(input).sort();
  const obj = input as Record<string, any>;
  return `{${keys
    .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
    .join(",")}}`;
}

function buildCacheKey(
  method: string,
  url: string,
  parts: Record<string, any>,
): string {
  const stable = stableStringify(parts ?? {});
  return `${method.toUpperCase()} ${url} :: ${stable}`;
}

function getCachedResponse<T>(key: string): AxiosResponse<T> | null {
  const now = nowMs();

  let entry = MEMORY_CACHE.get(key);
  if (!entry) {
    entry = safeLocalStorageGet(key) ?? undefined;
    if (entry) MEMORY_CACHE.set(key, entry);
  }

  if (!entry) return null;
  if (entry.expiresAt <= now) {
    MEMORY_CACHE.delete(key);
    safeLocalStorageRemove(key);
    return null;
  }

  const resp: AxiosResponse<T> = {
    data: entry.data as T,
    status: entry.status,
    statusText: entry.statusText,
    headers: entry.headers,
    config: {} as any,
    request: undefined,
  };
  return resp;
}

/** =========================
 *  Tag index & invalidate (tags + prefix)
 *  ========================= */

const TAG_INDEX_PREFIX = "__tags__";

function tagIndexKey(tag: string) {
  return `${CACHE_PREFIX}:${TAG_INDEX_PREFIX}:${tag}`;
}

function getTagKeys(tag: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(tagIndexKey(tag));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr as string[];
  } catch {
    return [];
  }
}

function setTagKeys(tag: string, keys: string[]) {
  if (typeof window === "undefined") return;
  try {
    const deduped = Array.from(new Set(keys));
    if (deduped.length === 0) {
      window.localStorage.removeItem(tagIndexKey(tag));
    } else {
      window.localStorage.setItem(tagIndexKey(tag), JSON.stringify(deduped));
    }
  } catch {
    // ignore
  }
}

function addTagsForKey(cacheKey: string, tags?: string[]) {
  if (!tags || tags.length === 0) return;
  for (const tag of tags) {
    const keys = getTagKeys(tag);
    keys.push(cacheKey);
    setTagKeys(tag, keys);
  }
}

function setCachedResponse<T>(
  key: string,
  res: AxiosResponse<T>,
  ttlMs: number,
  tags?: string[],
) {
  const entry: StoredCacheEntry = {
    data: res.data,
    status: res.status,
    statusText: res.statusText,
    headers: res.headers as any,
    expiresAt: nowMs() + ttlMs,
  };
  MEMORY_CACHE.set(key, entry);
  safeLocalStorageSet(key, entry);
  addTagsForKey(key, tags);
}

/** =========================
 *  Broadcast đa tab (CACHE)
 *  ========================= */

const CACHE_BC_NAME = "__api_cache_channel__";

type CacheInvalidateMessage = {
  type: "invalidate";
  tags?: string[];
  tagPrefixes?: string[];
};

type InvalidateOptions = {
  tags?: string[];
  tagPrefixes?: string[];
  broadcast: boolean;
};

let cacheChannel: BroadcastChannel | null = null;

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  cacheChannel = new BroadcastChannel(CACHE_BC_NAME);
  cacheChannel.onmessage = (ev) => {
    const msg = ev.data as CacheInvalidateMessage;
    if (!msg || msg.type !== "invalidate") return;
    invalidateCacheInternal({
      tags: msg.tags,
      tagPrefixes: msg.tagPrefixes,
      broadcast: false, // tránh loop
    });
  };
}

function broadcastInvalidate(opts: InvalidateOptions) {
  if (!cacheChannel) return;
  const payload: CacheInvalidateMessage = {
    type: "invalidate",
    tags: opts.tags,
    tagPrefixes: opts.tagPrefixes,
  };
  cacheChannel.postMessage(payload);
}

function invalidateSingleTag(tag: string) {
  const keys = getTagKeys(tag);
  if (!keys || keys.length === 0) {
    setTagKeys(tag, []);
    return;
  }

  for (const key of keys) {
    MEMORY_CACHE.delete(key);
    safeLocalStorageRemove(key);
  }

  setTagKeys(tag, []);
}

function invalidateCacheInternal(opts: InvalidateOptions) {
  const tags = Array.from(new Set(opts.tags ?? []));
  const prefixes = Array.from(new Set(opts.tagPrefixes ?? []));

  // 1. Exact tags
  for (const tag of tags) {
    invalidateSingleTag(tag);
  }

  // 2. Prefix
  if (prefixes.length > 0 && typeof window !== "undefined") {
    const prefixBase = `${CACHE_PREFIX}:${TAG_INDEX_PREFIX}:`;
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(prefixBase)) continue;

      const tag = key.slice(prefixBase.length);
      if (prefixes.some((p) => tag.startsWith(p))) {
        invalidateSingleTag(tag);
      }
    }
  }

  if (opts.broadcast) {
    broadcastInvalidate({ tags, tagPrefixes: prefixes, broadcast: false });
  }
}

function invalidateCacheByTags(tags: string[]) {
  if (!tags || tags.length === 0) return;
  invalidateCacheInternal({ tags, tagPrefixes: [], broadcast: true });
}

function invalidateCacheByTagPrefixes(prefixes: string[]) {
  if (!prefixes || prefixes.length === 0) return;
  invalidateCacheInternal({ tags: [], tagPrefixes: prefixes, broadcast: true });
}

export function invalidateApiCache(tags?: string[], prefixes?: string[]) {
  if (tags && tags.length) invalidateCacheByTags(tags);
  if (prefixes && prefixes.length) invalidateCacheByTagPrefixes(prefixes);
}

/** =========================
 *  ApiClient (singleton)
 *  ========================= */

type DedupConfig = AxiosRequestConfig & {
  dedupKey?: string | false;

  // cache
  cacheMode?: CacheMode;
  cacheKey?: string;
  cacheTTL?: number;
  cacheTags?: string[];

  // invalidate
  invalidateTags?: string[];
  invalidateTagPrefixes?: string[];

  // others
  isRefresh?: boolean;
};

export class ApiClient {
  private readonly instance: AxiosInstance;
  private constructor(axiosInstance: AxiosInstance) {
    this.instance = axiosInstance;
  }

  private inflight = new Map<string, Promise<AxiosResponse<any>>>();

  static create(): ApiClient {
    // Singleton thật sự (chống HMR/dev tạo nhiều instance gây flicker do request lặp)
    if (globalThis.__API_CLIENT_SINGLETON__)
      return globalThis.__API_CLIENT_SINGLETON__;

    const axiosInstance = axios.create({
      baseURL: "",
      headers: { "Content-Type": "application/json" },
      timeout: 10000,
    });

    // ----- Request interceptor (DUY NHẤT) -----
    axiosInstance.interceptors.request.use(
      async (
        config: InternalAxiosRequestConfig,
      ): Promise<InternalAxiosRequestConfig> => {
        const ensureHeaders = () => {
          if (!config.headers) config.headers = new AxiosHeaders();
          return config.headers as AxiosHeaders | Record<string, any>;
        };
        const setAuth = (token: string) => {
          const h = ensureHeaders();
          if (typeof (h as any).set === "function")
            (h as AxiosHeaders).set("Authorization", `Bearer ${token}`);
          else
            (config.headers as any) = {
              ...(config.headers as any),
              Authorization: `Bearer ${token}`,
            };
        };

        const isRefresh = isRefreshRequest(config);
        if (!isRefresh) {
          // API requests should keep using the current access token until it is
          // effectively expired, instead of eagerly refreshing far in advance.
          const token = await ensureValidAccessToken({ minValiditySeconds: 5 });
          if (token) {
            setAuth(token);
          }
        }

        // Gắn Idempotency-Key cho POST/PUT/DELETE
        const method = (config.method ?? "get").toUpperCase();
        if (method === "POST" || method === "PUT" || method === "DELETE") {
          const key = getIdemKeyFor(config);
          config.headers = config.headers ?? {};
          (config.headers as any)["Idempotency-Key"] = key;
        }

        return config;
      },
    );

    // ----- Response interceptor -----
    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original: InternalAxiosRequestConfig & { _retry?: boolean } =
          error?.config ?? {};
        const status = error?.response?.status as number | undefined;

        if (
          status === 401 &&
          !original._retry &&
          !isRefreshRequest(original) &&
          getRefreshToken()
        ) {
          original._retry = true;
          const newToken = await refreshOnce();
          if (newToken) {
            const headers = new AxiosHeaders(original.headers as any);
            headers.set("Authorization", `Bearer ${newToken}`);
            original.headers = headers;
            return axiosInstance.request(original);
          }
        }
        return Promise.reject(error);
      },
    );

    const client = new ApiClient(axiosInstance);
    globalThis.__API_CLIENT_SINGLETON__ = client;
    return client;
  }

  /** =========================
   *  Wrapped HTTP (dedup + retry + cache)
   *  ========================= */

  async get<T>(
    url: string,
    config?: DedupConfig,
  ): Promise<AxiosResponse<T>> {
    const exec = () => this.instance.get<T>(url, config);
    return this.requestWithDedup<T>(
      "GET",
      url,
      exec,
      { params: config?.params },
      config,
    );
  }

  async getAsPost<T>(
    url: string,
    data?: any,
    config?: DedupConfig,
  ): Promise<AxiosResponse<T>> {
    const exec = () => this.instance.post<T>(url, data, config);
    return await this.requestWithDedup<T>(
      "POST",
      url,
      exec,
      { data, params: config?.params },
      config,
    );
  }

  async getTable<T>(
    url: string,
    tableOpts: FetchTableOpts,
    config?: DedupConfig,
  ): Promise<AxiosResponse<T>> {
    const tableOptsDto = mapper.map<FetchTableOpts, any>(
      "TableOpts",
      tableOpts,
      "model_to_dto",
    );
    const cfg = { params: tableOptsDto, ...config };
    const exec = () => this.instance.get<T>(url, cfg);
    return this.requestWithDedup<T>(
      "GET",
      url,
      exec,
      { params: tableOptsDto },
      cfg,
    );
  }

  async search<T>(
    url: string,
    opts: SearchOpts & Record<string, any>,
    config?: DedupConfig,
  ): Promise<AxiosResponse<T>> {
    const dto = mapper.map<SearchOpts, any>(
      "SearchOpts",
      opts,
      "model_to_dto",
    );
    const cfg = { params: dto, ...config };
    const exec = () => this.instance.get<T>(url, cfg);
    return this.requestWithDedup<T>("GET", url, exec, { params: dto }, cfg);
  }

  async post<T>(
    url: string,
    data?: any,
    config?: DedupConfig,
  ): Promise<AxiosResponse<T>> {
    const exec = () => this.instance.post<T>(url, data, config);
    const res = await this.requestWithDedup<T>(
      "POST",
      url,
      exec,
      { data, params: config?.params },
      config,
    );

    if (config) {
      if (config.invalidateTags?.length)
        invalidateCacheByTags(config.invalidateTags);
      if (config.invalidateTagPrefixes?.length)
        invalidateCacheByTagPrefixes(config.invalidateTagPrefixes);
    }

    return res;
  }

  async put<T>(
    url: string,
    data?: any,
    config?: DedupConfig,
  ): Promise<AxiosResponse<T>> {
    const exec = () => this.instance.put<T>(url, data, config);
    const res = await this.requestWithDedup<T>(
      "PUT",
      url,
      exec,
      { data, params: config?.params },
      config,
    );

    if (config) {
      if (config.invalidateTags?.length)
        invalidateCacheByTags(config.invalidateTags);
      if (config.invalidateTagPrefixes?.length)
        invalidateCacheByTagPrefixes(config.invalidateTagPrefixes);
    }

    return res;
  }

  async delete<T>(
    url: string,
    config?: DedupConfig,
  ): Promise<AxiosResponse<T>> {
    const exec = () => this.instance.delete<T>(url, config);
    const res = await this.requestWithDedup<T>(
      "DELETE",
      url,
      exec,
      { data: (config as any)?.data, params: config?.params },
      config,
    );

    if (config) {
      if (config.invalidateTags?.length)
        invalidateCacheByTags(config.invalidateTags);
      if (config.invalidateTagPrefixes?.length)
        invalidateCacheByTagPrefixes(config.invalidateTagPrefixes);
    }

    return res;
  }

  /** =========================
   *  Dedup + retry + cache core
   *  ========================= */

  private async requestWithDedup<T>(
    method: string,
    url: string,
    factory: () => Promise<AxiosResponse<T>>,
    keyParts: Record<string, any>,
    config?: DedupConfig,
  ): Promise<AxiosResponse<T>> {
    const upperMethod = method.toUpperCase();
    const dedupKey = config?.dedupKey;

    const cacheMode: CacheMode = config?.cacheMode ?? "off";
    const cacheTTL = config?.cacheTTL ?? DEFAULT_CACHE_TTL_MS;

    // const isGet = upperMethod === "GET";
    // const cacheEnabled = isGet && cacheMode !== "off";
    const cacheEnabled = cacheMode !== "off";

    const cacheKey =
      config?.cacheKey ?? buildCacheKey(upperMethod, url, keyParts);

    // 1) cache-first / stale-while-revalidate -> đọc cache trước
    if (
      cacheEnabled &&
      (cacheMode === "cache-first" || cacheMode === "stale-while-revalidate")
    ) {
      const cached = getCachedResponse<T>(cacheKey);
      if (cached) {
        if (cacheMode === "stale-while-revalidate") {
          // Refresh nền
          void (async () => {
            try {
              const fresh = await this.runWithDedupAndRetry<T>(
                upperMethod,
                url,
                factory,
                keyParts,
                dedupKey,
                {
                  isRefresh: config?.isRefresh,
                },
              );
              if (fresh.status >= 200 && fresh.status < 400) {
                setCachedResponse(
                  cacheKey,
                  fresh,
                  cacheTTL,
                  config?.cacheTags,
                );
              }
            } catch {
              // ignore background error
            }
          })();
        }
        return cached;
      }
    }

    // 2) gọi network (dedup + retry)
    const res = await this.runWithDedupAndRetry<T>(
      upperMethod,
      url,
      factory,
      keyParts,
      dedupKey,
      {
        isRefresh: config?.isRefresh,
      },
    );

    // 3) lưu cache
    if (cacheEnabled && res.status >= 200 && res.status < 400) {
      setCachedResponse(cacheKey, res, cacheTTL, config?.cacheTags);
    }

    return res;
  }

  private async runWithDedupAndRetry<T>(
    method: string,
    url: string,
    factory: () => Promise<AxiosResponse<T>>,
    keyParts: Record<string, any>,
    dedupKey?: string | false,
    opts?: { isRefresh?: boolean; },
  ): Promise<AxiosResponse<T>> {
    // Cho phép tắt dedup hoặc đặt key tùy chỉnh
    const key =
      dedupKey === false
        ? null
        : dedupKey || this.buildDedupKey(method, url, keyParts);

    if (!key) {
      return this.withRetry(factory, undefined, undefined, opts);
    }

    const existed = this.inflight.get(key);
    if (existed) return existed as Promise<AxiosResponse<T>>;

    const p = this.withRetry(factory, undefined, undefined, opts).finally(() => {
      this.inflight.delete(key);
    }) as Promise<AxiosResponse<T>>;

    this.inflight.set(key, p);
    return p;
  }

  private buildDedupKey(
    method: string,
    url: string,
    parts: Record<string, any>,
  ): string {
    const stable = stableStringify(parts ?? {});
    return `${method.toUpperCase()} ${url} :: ${stable}`;
  }

  private async withRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    maxAttempts = 3,
    delayMs = 1000,
    opts?: { isRefresh?: boolean }
  ): Promise<AxiosResponse<T>> {
    let attempt = 0;

    while (true) {
      try {
        const res = await requestFn();

        if (
          res.data &&
          typeof res.data === "object" &&
          (res.data as any).statusCode === 102
        ) {
          throw new ApiServiceError({
            statusCode: (res.data as any).statusCode,
            errorCode: (res.data as any).errorCode,
            statusMessage: (res.data as any).statusMessage,
          });
        }

        return res;
      } catch (err: any) {
        attempt++;

        const status = err?.response?.status;
        const message = err?.message ?? "";

        let retryable =
          // Network
          ["ECONNABORTED"].includes(err?.code) ||
          message.includes("timeout") ||
          // 5xx except 500 501
          (
            typeof status === "number" &&
            status >= 500 &&
            status !== 500 &&
            status !== 501
          );

        if (opts?.isRefresh) {
          retryable =
            ["ECONNABORTED"].includes(err?.code) ||
            message.includes("timeout") ||
            (typeof status === "number" && status >= 500);
        }

        if (!retryable || attempt >= maxAttempts) {
          const isAuthError = status === 401 || status === 403;

          if (!isAuthError) {
            console.error(
              `[Axios] Request failed after ${attempt} attempts`,
              err,
            );
          }

          throw err;
        }

        // Delay retry
        const jitter = Math.floor(Math.random() * 200);
        await new Promise((r) => setTimeout(r, delayMs + jitter));
      }
    }
  }
}

// Singleton export
export const apiClient = ApiClient.create();
