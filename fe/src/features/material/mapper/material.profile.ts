import { mapper } from "@root/core/mapper/auto-mapper";
import type { MaterialModel } from "@features/material/model/material.model";

mapper.register<MaterialModel>({
  name: "Material",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    code: "",
    name: "",
    type: null,
    isImplant: false,
    active: true,
    retailPrice: null,
    supplierIds: [],
    supplierNames: "",
    customFields: null,
  }),
});
