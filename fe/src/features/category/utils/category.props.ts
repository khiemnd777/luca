import type { FormContext } from "@core/form/types";
import { id as fetchCategoryById, search as searchCategory } from "../api/category.api";
import type { CategoryModel } from "../model/category.model";
import { validateParentCategorySelection } from "./category.validate";
import { categoryPath } from "./category.utils";

type CategoryValueHolder = Record<string, any>;

const getInputLabel = (d?: CategoryModel | null) => d?.name ?? "";

const getOptionLabel = (d?: CategoryModel | null) => (d ? categoryPath(d) : "");

const searchPage = async (kw: string, page: number, limit: number): Promise<CategoryModel[]> => {
  const result = await searchCategory({
    keyword: kw,
    limit,
    page,
    orderBy: "parent_id",
  });
  return result.items;
};

const hydrateById = async (idValue: number | string | null | undefined): Promise<CategoryModel | null> => {
  if (!idValue) return null;
  const category = await fetchCategoryById(Number(idValue));
  return category ?? null;
};

const fetchOne = async (values: CategoryValueHolder): Promise<CategoryModel | null> => {
  const key = values.parentId ?? values.categoryId;
  if (!key) return null;
  const category = await fetchCategoryById(Number(key));
  return category ?? null;
};

const syncParentInfo = (parent: CategoryModel | null, ctx?: FormContext | null) => {
  const nextLevel = (parent?.level ?? 0) + 1;
  ctx?.setValue("level", nextLevel);
  ctx?.setValue("parentId", parent?.id ?? null);

  const lv1Id = parent?.categoryIdLv1 ?? (parent?.level === 1 ? parent.id : null);
  const lv1Name = parent?.categoryNameLv1 ?? (parent?.level === 1 ? parent.name : null);
  const lv2Id = parent?.categoryIdLv2 ?? (parent?.level === 2 ? parent.id : null);
  const lv2Name = parent?.categoryNameLv2 ?? (parent?.level === 2 ? parent.name : null);
  const lv3Id = parent?.categoryIdLv3 ?? (parent?.level === 3 ? parent.id : null);
  const lv3Name = parent?.categoryNameLv3 ?? (parent?.level === 3 ? parent.name : null);

  ctx?.setValue("categoryIdLv1", lv1Id ?? null);
  ctx?.setValue("categoryNameLv1", lv1Name ?? null);
  ctx?.setValue("categoryIdLv2", lv2Id ?? null);
  ctx?.setValue("categoryNameLv2", lv2Name ?? null);
  ctx?.setValue("categoryIdLv3", lv3Id ?? null);
  ctx?.setValue("categoryNameLv3", lv3Name ?? null);
};

const onBlur = (_: string, matched: any, ctx?: FormContext | null) => {
  if (!ctx || (!("parentId" in ctx.values) && !("level" in ctx.values))) return;

  const parent = matched as CategoryModel | null;
  const prevParentId = ctx.values.parentId;
  const error = validateParentCategorySelection(parent, ctx.values);
  if (error) {
    ctx.setFieldError("parentId", error);
    ctx.setValue("parentId", prevParentId);
    return;
  }

  ctx.setFieldError("parentId", null);

  syncParentInfo(parent, ctx);
};

export const categoryProps = {
  getInputLabel,
  getOptionLabel,
  searchPage,
  hydrateById,
  fetchOne,
  onBlur,
};
