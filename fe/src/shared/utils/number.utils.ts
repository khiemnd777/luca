export function parseIntSafe(v: any): number {
  if (v === null || v === undefined) return -1;

  if (typeof v === "number") {
    return Number.isFinite(v) ? Math.trunc(v) : -1;
  }

  if (typeof v === "boolean") {
    return v ? 1 : 0;
  }

  if (typeof v === "string") {
    let s = v.trim();
    if (s === "") return -1;
    s = s.replace(/,/g, "").replace(/_/g, "");
    if (!/^[+-]?\d+$/.test(s)) return -1;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : -1;
  }

  return -1;
}
