import { mapper } from "@root/core/mapper/auto-mapper";
import type { RestorationTypeModel } from "@features/restoration_type/model/restoration_type.model";

mapper.register<RestorationTypeModel>({
  name: "RestorationType",
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
