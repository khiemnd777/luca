import { mapper } from "@root/core/mapper/auto-mapper";
import type { InProgressOrderModel } from "../model/inprogress-order.model";

mapper.register<InProgressOrderModel>({
  name: "InProgressOrder",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    code: null,
    codeLatest: null,
    deliveryDate: null,
    now: null,
    totalPrice: null,
    processNameLatest: null,
    statusLatest: null,
    priorityLatest: null,
  }),
});
