import type { OrderItemMaterialModel } from "./order-item-material.model";
import type { OrderItemProductModel } from "./order-item-product.model";
import type { DeliveryProofModel } from "./order.model";

export interface OrderItemModel {
  // general
  id: number;
  orderId: number;
  parentItemId: number;
  customFields?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  // order
  code: string;
  codeOriginal: string;
  qrCode?: string | null;
  remakeCount: number;
  isCash: boolean;
  isCredit: boolean;
  // product
  productId?: number | null;
  productName?: string;
  deliveryDate?: string | null;
  imageUrl?: string | null;
  proofImageUrl?: string | null;
  deliveryProofs?: DeliveryProofModel[] | null;
  orderDeliveryProofs?: DeliveryProofModel[] | null;
  // products
  products?: OrderItemProductModel[] | null;
  // consumable materials
  consumableMaterials?: OrderItemMaterialModel[] | null;
  // loaner materials
  loanerMaterials?: OrderItemMaterialModel[] | null;
}

export interface OrderItemUpsertModel {
  dto: OrderItemModel;
  collections?: (string | undefined)[];
}

export interface OrderItemHistoricalModel {
  id: number;
  code: string;
  createdAt: string;
  isCurrent: boolean;
  isHighlight: boolean;
}

export interface CalculateTotalPricePayload {
  prices: number[];
  quantities: number[];
}
