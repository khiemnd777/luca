export interface OrderItemProcessModel {
  id?: number;
  orderId?: number | null;
  orderItemId?: number | null;

  orderCode?: string | null;
  productId?: number | null;
  productCode?: string | null;
  productName?: string | null;
  processName?: string | null;
  sectionName?: string | null;
  color?: string | null;
  stepNumber?: number;

  startedAt?: string | null;
  completedAt?: string | null;

  note?: string | null;

  assignedId?: number | null;
  assignedName?: string | null;

  customFields?: Record<string, any> | null;
}

export interface OrderItemProcessUpsertModel {
  dto: OrderItemProcessModel;
  collections?: (string | undefined)[];
}
