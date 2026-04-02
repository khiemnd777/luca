import type { InternalAxiosRequestConfig } from "axios";

function stableStringify(input: any): string {
  if (input === null || typeof input !== "object") return String(input);
  if (Array.isArray(input)) return `[${input.map(stableStringify).join(",")}]`;
  const keys = Object.keys(input).sort();
  return `{${keys.map(k => JSON.stringify(k) + ":" + stableStringify((input as any)[k])).join(",")}}`;
}

function formDataToObject(fd: FormData): Record<string, any> {
  const obj: Record<string, any> = {};
  fd.forEach((v, k) => {
    if (v instanceof File) obj[k] = { name: v.name, size: v.size, type: v.type };
    else obj[k] = v;
  });
  return obj;
}

function quickHash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function normalizeData(data: any): any {
  if (typeof FormData !== "undefined" && data instanceof FormData) {
    return formDataToObject(data);
  }
  return data;
}

function buildFingerprint(config: InternalAxiosRequestConfig): string {
  const method = (config.method ?? "get").toUpperCase();
  const url = config.url ?? "";
  const paramsHash = quickHash(stableStringify(config.params ?? {}));
  const dataNorm = normalizeData(config.data);
  const dataHash = quickHash(stableStringify(dataNorm));
  return `${method}:${url}:${paramsHash}:${dataHash}`;
}

const IDEMP_CACHE = new Map<string, { key: string; at: number }>();
const IDEMP_TTL_MS = 5 * 60 * 1000;

export function getIdemKeyFor(config: InternalAxiosRequestConfig): string {
  const fp = buildFingerprint(config);
  const now = Date.now();

  // dọn rác lười biếng
  for (const [k, v] of IDEMP_CACHE) {
    if (now - v.at > IDEMP_TTL_MS) IDEMP_CACHE.delete(k);
  }

  const hit = IDEMP_CACHE.get(fp);
  if (hit) return hit.key;

  const day = new Date().toISOString().slice(0, 10);
  const key = `${quickHash(fp)}-${day}`;
  IDEMP_CACHE.set(fp, { key, at: now });
  return key;
}