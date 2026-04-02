import { mapper } from "@root/core/mapper/auto-mapper";
import type { ProductModel } from "@features/product/model/product.model";

mapper.register<ProductModel>({
  name: "Product",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    code: "",
    name: "",
    active: true,
    customFields: null,
    processNames: "",
    categoryId: null,
    categoryName: null,
    retailPrice: null,
    costPrice: null,
    updatedAt: "",
    collectionId: null,
    templateId: null,
    isTemplate: true,
  }),
});
