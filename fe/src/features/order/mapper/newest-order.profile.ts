import { mapper } from "@root/core/mapper/auto-mapper";
import type { NewestOrderModel } from "../model/newest-order.model";

mapper.register<NewestOrderModel>({
  name: "NewestOrder",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    code: null,
    codeLatest: null,
    createdAt: null,
    statusLatest: null,
    priorityLatest: null,
  }),
});
