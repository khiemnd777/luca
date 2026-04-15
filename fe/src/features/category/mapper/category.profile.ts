import { mapper } from "@root/core/mapper/auto-mapper";
import type { CategoryModel } from "@features/category/model/category.model";

mapper.register<CategoryModel>({
  name: "Category",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    code: "",
    name: "",
    active: true,
    collectionId: null,
    customFields: null,
    relationFields: null,
    productIds: null,
    level: null,
    parentId: null,
    categoryIdLv1: null,
    categoryNameLv1: null,
    categoryIdLv2: null,
    categoryNameLv2: null,
    categoryIdLv3: null,
    categoryNameLv3: null,
    createdAt: "",
    updatedAt: "",
  }),
});
