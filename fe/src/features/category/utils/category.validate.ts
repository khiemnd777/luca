import type { CategoryModel } from "../model/category.model";

export function validateParentCategorySelection(
  parent: CategoryModel | null,
  values?: Record<string, any>,
): string | null {
  if (!parent) return null;

  const currentId = values?.id;
  if (currentId !== undefined && parent.id === currentId) {
    return "Không thể chọn chính danh mục này làm cha";
  }

  const level = values?.level ?? 1;
  const parentLevel = parent.level ?? 0;
  if (currentId !== undefined && parentLevel > level) {
    const ancestorFields: Record<number, keyof CategoryModel | undefined> = {
      1: "categoryIdLv1",
      2: "categoryIdLv2",
      3: "categoryIdLv3",
    };
    const ancestorField = ancestorFields[level];
    if (ancestorField) {
      const ancestorId = parent[ancestorField];
      if (ancestorId === currentId) {
        return "Không thể chọn danh mục cấp thấp hơn hoặc ngang bằng làm cha";
      }
    }
  }

  return null;
}
