export type I18nText = {
  kind: "i18n-key";
  key: string;
  fallback?: string;
};

export type LocalizedText = string | I18nText;

export function l(key: string, fallback?: string): I18nText {
  return {
    kind: "i18n-key",
    key,
    fallback,
  };
}

export function isI18nText(value: unknown): value is I18nText {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<I18nText>;
  return candidate.kind === "i18n-key" && typeof candidate.key === "string";
}

export function resolveLocalizedText(
  value: LocalizedText | null | undefined,
  t: (key: string, fallback?: string) => string
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return t(value.key, value.fallback);
}

export function getLocalizedSortText(value: LocalizedText | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.fallback ?? value.key;
}
