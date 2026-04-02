import type { CategoryModel } from "../model/category.model";

const NBSP = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0";

export function categoryTree(d: CategoryModel, others: CategoryModel[]): string {
  const level = d.level ?? 1;

  // LEVEL 1
  if (level === 1) return d.name ?? "";

  const siblings = others
    .filter(x => x.parentId === d.parentId)
    .sort((a, b) => (a.id - b.id));

  const idx = siblings.findIndex(x => x.id === d.id);
  const isLast = idx === siblings.length - 1;

  const prefix = isLast ? "└─ " : "├─ ";

  // LEVEL 2 → NO INDENT
  if (level === 2) {
    return prefix + d.name;
  }

  // LEVEL >= 3 → indent = (level - 2)
  const indent = NBSP.repeat(level - 2);

  return indent + prefix + d.name;
}

export function categoryPath(item: CategoryModel): string {
  const parts: string[] = [];

  if (item.categoryNameLv1) parts.push(item.categoryNameLv1);
  if (item.categoryNameLv2) parts.push(item.categoryNameLv2);
  if (item.categoryNameLv3) parts.push(item.categoryNameLv3);

  if (item.name) parts.push(item.name);

  return parts.join(" > ");
}
