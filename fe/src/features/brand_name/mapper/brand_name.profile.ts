import { mapper } from "@root/core/mapper/auto-mapper";
import type { BrandNameModel } from "@features/brand_name/model/brand_name.model";

mapper.register<BrandNameModel>({
  name: "BrandName",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    categoryId: null,
    categoryName: null,
    code: "",
    name: "",
    createdAt: "",
    updatedAt: "",
  }),
});
