import { mapper } from "@root/core/mapper/auto-mapper";
import type { SupplierModel } from "@features/supplier/model/supplier.model";

mapper.register<SupplierModel>({
  name: "Supplier",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    code: "",
    name: "",
    active: true,
    customFields: null,
  }),
});
