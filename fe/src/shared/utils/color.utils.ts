export function getContrastText(bg: string): "#000" | "#fff" {
  if (!bg) return "#000";
  const rgb = hexToRgb(bg);
  if (!rgb) return "#000";
  const L = luminance(rgb);
  return L > 0.5 ? "#000" : "#fff";
}

function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const s = hex.replace("#", "").trim();
  if (![3, 6].includes(s.length)) return null;
  const full = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function srgbToLinear(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}