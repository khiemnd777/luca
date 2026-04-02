import { mapper } from "@root/core/mapper/auto-mapper";
import type { OrderItemMaterialModel } from "../model/order-item-material.model";

mapper.register<OrderItemMaterialModel>({
  name: "OrderItemMaterial",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    materialCode: null,
    materialName: null,
    materialId: null,
    orderItemId: null,
    orderItemCode: null,
    orderId: null,
    quantity: 0,
    retailPrice: null,
    type: null,
    status: null,
    isCloneable: null,
    note: null,
    clinicId: null,
    clinicName: null,
    dentistId: null,
    dentistName: null,
    patientId: null,
    patientName: null,
    onLoanAt: null,
    returnedAt: null,
  }),
});
