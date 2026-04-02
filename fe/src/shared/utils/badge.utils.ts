export function formatBadgeCount(
  count: number,
  max: number
): string | number {
  if (count > max) return `${max}+`;
  return count;
}
