import { isJSON, parseJSON } from "@shared/utils/json.utils";

export function parseShowIfDependencies(showIfStr?: string | null): string[] {
  if (!showIfStr || typeof showIfStr !== "string") return [];
  if (!isJSON(showIfStr)) return [];

  const obj = parseJSON(showIfStr);
  if (!obj || typeof obj !== "object") return [];

  const out = new Set<string>();

  // NO NORMALIZATION — keep original path exactly
  function normalize(path: string): string {
    return path;
  }

  function collect(o: any) {
    if (!o || typeof o !== "object") return;

    if (typeof o.field === "string") {
      out.add(normalize(o.field));
      return;
    }

    if (Array.isArray(o.any)) o.any.forEach(collect);
    if (Array.isArray(o.all)) o.all.forEach(collect);
    if (Array.isArray(o.none)) o.none.forEach(collect);
    if (o.not) collect(o.not);
  }

  collect(obj);
  return Array.from(out);
}
