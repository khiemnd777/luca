import { mapper } from "@root/core/mapper/auto-mapper";
import type { CustomerModel } from "@features/customer/model/customer.model";

mapper.register<CustomerModel>({
  name: "Customer",
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
