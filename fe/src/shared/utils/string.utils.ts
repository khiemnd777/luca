export function snakeToCamel(s: string) {
  return s.replace(/_+([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
}

export function camelToSnake(s: string) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

export function humanize(v: any): string {
  if (v == null) return "";

  let s = String(v).replace(/[_\-]+/g, " ").trim();
  if (!s) return "";

  return s[0].toUpperCase() + s.slice(1);
}

export function alphabetSeq(n: number): string {
  // n = 1 => A
  // n = 26 => Z
  // n = 27 => AA
  // n = 28 => AB
  let result = "";
  while (n > 0) {
    n--;
    const char = String.fromCharCode("A".charCodeAt(0) + (n % 26));
    result = char + result;
    n = Math.floor(n / 26);
  }
  return result;
}

export function normalizeVietnamese(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
}