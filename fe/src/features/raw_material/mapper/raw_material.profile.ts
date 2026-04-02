import { mapper } from "@root/core/mapper/auto-mapper";
import type { RawMaterialModel } from "@features/raw_material/model/raw_material.model";

mapper.register<RawMaterialModel>({
  name: "RawMaterial",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    categoryId: null,
    categoryName: null,
    name: "",
    createdAt: "",
    updatedAt: "",
  }),
});
