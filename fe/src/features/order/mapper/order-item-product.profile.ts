import { mapper } from "@root/core/mapper/auto-mapper";
import type { OrderItemProductModel } from "../model/order-item-product.model";

mapper.register<OrderItemProductModel>({
  name: "OrderItemProduct",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    productCode: null,
    productName: null,
    productId: null,
    orderItemId: null,
    orderItemCode: null,
    originalOrderItemId: null,
    orderId: null,
    quantity: 0,
    retailPrice: null,
    isCloneable: null,
    teethPosition: null,
    note: null,
  }),
});
