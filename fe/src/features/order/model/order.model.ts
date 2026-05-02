/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OrderItemModel, OrderItemUpsertModel } from "./order-item.model";

export interface DeliveryProofModel {
  id?: number | null;
  imageUrl?: string | null;
  proofImageUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface OrderModel {
  id: number;
  code: string;
  promotionCode?: string | null;
  promotionCodeId?: number | null;
  customFields?: Record<string, any> | null;
  latestOrderItemUpsert?: OrderItemUpsertModel | Record<string, any> | null;
  latestOrderItem?: OrderItemModel | Record<string, any> | null;
  customerId?: number | null;
  customerName?: string | null;
  clinicId?: number | null;
  clinicName?: string | null;
  dentistId?: number | null;
  dentistName?: string | null;
  patientId?: number | null;
  patientName?: string | null;
  refUserId?: number | null;
  refUserName?: string | null;
  statusLatest?: string;
  codeLatest?: string;
  priorityLatest?: string;
  processIdLatest?: number | null;
  processNameLatest?: string | null;
  productId?: number;
  productName?: string;
  quantity?: number;
  totalPrice?: number;
  deliveryDate?: string | null;
  eta?: string | null;
  deliveryAt?: string | null;
  remainingMinutes?: number | null;
  lateByMinutes?: number | null;
  riskScore?: number;
  riskBucket?: string | null;
  predictedLate?: boolean;
  imageUrl?: string | null;
  proofImageUrl?: string | null;
  deliveryProofs?: DeliveryProofModel[] | null;
  orderDeliveryProofs?: DeliveryProofModel[] | null;
  remakeType?: string;
  remakeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderUpsertModel {
  dto: OrderModel;
  collections?: (string | undefined)[];
}
