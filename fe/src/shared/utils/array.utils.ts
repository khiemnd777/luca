export function normalizeList<T>(data: T[] | T | null | undefined): T[] | null {
  if (data == null) return null;
  return Array.isArray(data) ? data : [data];
}