export interface OrderItemProductModel {
  id: number;
  productCode?: string | null;
  productName?: string | null;
  productId?: number | null;
  orderItemId?: number | null;
  orderItemCode?: string | null;
  originalOrderItemId?: number | null;
  orderId?: number | null;
  quantity: number;
  retailPrice?: number | null;
  isCloneable?: boolean | null;
  teethPosition?: string | null;
  note?: string | null;
}
