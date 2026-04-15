import { env } from "@core/config/env";
import { apiClient } from "@core/network/api-client";
import type {
  LanguageOption,
  LanguagePreference,
  ResourceDictionary,
} from "@core/i18n/i18n.types";

const i18nBasePath = `${env.apiBasePath}/i18n`;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

function parseLanguageCode(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();

  const record = asRecord(value);
  if (!record) return null;

  const direct =
    record.code ??
    record.language_code ??
    record.languageCode;

  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const language = asRecord(record.language);
  if (!language) return null;

  const nested =
    language.code ??
    language.language_code ??
    language.languageCode;

  return typeof nested === "string" && nested.trim() ? nested.trim() : null;
}

function normalizeLanguageOption(value: unknown): LanguageOption | null {
  const record = asRecord(value);
  if (!record) return null;

  const code = parseLanguageCode(record);
  if (!code) return null;

  return {
    code,
    name: typeof record.name === "string" && record.name.trim() ? record.name.trim() : code,
    nativeName:
      typeof record.native_name === "string"
        ? record.native_name
        : typeof record.nativeName === "string"
          ? record.nativeName
          : null,
    isDefault: parseBoolean(record.is_default ?? record.isDefault, false),
    active: parseBoolean(record.active, true),
  };
}

function normalizeLanguageCollection(data: unknown): LanguageOption[] {
  if (Array.isArray(data)) {
    return data
      .map(normalizeLanguageOption)
      .filter((item): item is LanguageOption => item !== null);
  }

  const record = asRecord(data);
  if (!record) return [];

  const candidates = [
    record.items,
    record.rows,
    record.data,
    record.languages,
    asRecord(record.data)?.items,
    asRecord(record.data)?.rows,
    asRecord(record.data)?.languages,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .map(normalizeLanguageOption)
        .filter((item): item is LanguageOption => item !== null);
    }
  }

  const single = normalizeLanguageOption(record);
  return single ? [single] : [];
}

function normalizeResourceEntries(entries: unknown): ResourceDictionary {
  if (Array.isArray(entries)) {
    return entries.reduce<ResourceDictionary>((acc, item) => {
      const record = asRecord(item);
      if (!record) return acc;
      const key = typeof record.key === "string" ? record.key.trim() : "";
      const value = typeof record.value === "string" ? record.value : "";
      if (key) acc[key] = value;
      return acc;
    }, {});
  }

  const record = asRecord(entries);
  if (!record) return {};

  return Object.entries(record).reduce<ResourceDictionary>((acc, [key, value]) => {
    if (typeof value === "string" && key.trim()) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function normalizeResources(data: unknown): ResourceDictionary {
  const record = asRecord(data);
  if (!record) return normalizeResourceEntries(data);

  const candidates = [
    record.resources,
    record.items,
    asRecord(record.data)?.resources,
    asRecord(record.data)?.items,
    asRecord(record.language)?.resources,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeResourceEntries(candidate);
    if (Object.keys(normalized).length > 0) return normalized;
  }

  const looksLikeEnvelope =
    "resources" in record ||
    "requested_code" in record ||
    "effective_code" in record ||
    "language" in record ||
    "data" in record;

  if (!looksLikeEnvelope) {
    return normalizeResourceEntries(record);
  }

  return {};
}

export async function listActiveLanguages(): Promise<LanguageOption[]> {
  const { data } = await apiClient.get<unknown>(`${i18nBasePath}/active-languages`, {
    cacheMode: "stale-while-revalidate",
    cacheTags: ["admin-i18n:languages"],
  });

  return normalizeLanguageCollection(data).filter((language) => language.active !== false);
}

export async function getMyLanguagePreference(): Promise<LanguagePreference> {
  const { data } = await apiClient.get<unknown>(`${i18nBasePath}/me/language`, {
    cacheMode: "stale-while-revalidate",
    cacheTags: ["admin-i18n:preference"],
  });

  return {
    code: parseLanguageCode(data),
  };
}

export async function updateMyLanguagePreference(code: string): Promise<LanguagePreference> {
  const { data } = await apiClient.put<unknown>(
    `${i18nBasePath}/me/language`,
    { code },
    {
      invalidateTagPrefixes: ["admin-i18n:"],
    }
  );

  return {
    code: parseLanguageCode(data) ?? code,
  };
}

export async function getResourcesByCode(code: string): Promise<ResourceDictionary> {
  const { data } = await apiClient.get<unknown>(`${i18nBasePath}/admin-resources/${encodeURIComponent(code)}`, {
    cacheMode: "stale-while-revalidate",
    cacheTags: [`admin-i18n:resources:${code}`],
  });

  return normalizeResources(data);
}
