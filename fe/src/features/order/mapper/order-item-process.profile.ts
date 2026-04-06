import { mapper } from "@root/core/mapper/auto-mapper";
import type { OrderItemProcessModel } from "../model/order-item-process.model";

mapper.register<OrderItemProcessModel>({
  name: "OrderItemProcess",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    orderId: null,
    orderItemId: null,
    orderCode: null,
    productId: null,
    productCode: null,
    productName: null,
    processName: null,
    sectionName: null,
    color: null,
    stepNumber: 0,
    startedAt: null,
    completedAt: null,
    note: null,
    assignedId: null,
    assignedName: null,
    customFields: null,
  }),
});
