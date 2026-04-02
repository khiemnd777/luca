export function isObjectEmpty(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return true;
  return Object.keys(obj as Record<string, unknown>).length === 0;
}
