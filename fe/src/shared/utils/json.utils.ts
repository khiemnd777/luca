export function isJSON(value: string): boolean {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    const unescaped = trimmed.replace(/\\"/g, '"');
    JSON.parse(unescaped);
    return true;
  } catch {
    return false;
  }
}

export function parseJSON<T = any>(value: string): T | null {
  if (typeof value !== "string") return null;

  try {
    const unescaped = value.trim().replace(/\\"/g, '"');

    return JSON.parse(unescaped) as T;
  } catch {
    return null;
  }
}

