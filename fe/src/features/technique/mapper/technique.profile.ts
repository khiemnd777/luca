import { mapper } from "@root/core/mapper/auto-mapper";
import type { TechniqueModel } from "@features/technique/model/technique.model";

mapper.register<TechniqueModel>({
  name: "Technique",
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
