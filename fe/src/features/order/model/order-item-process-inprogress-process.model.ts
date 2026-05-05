export interface OrderItemProcessInProgressProcessModel {
  id?: number;
  orderId?: number | null;
  orderItemId?: number | null;
  orderItemCode?: string | null;
  productId?: number | null;
  productCode?: string | null;
  productName?: string | null;
  checkInNote?: string | null;
  checkOutNote?: string | null;
  assignedId?: number | null;
  assignedName?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  processName?: string | null;
  sectionName?: string | null;
  sectionId?: number | null;
  color?: string | null;
  requiresDentistReview?: boolean | null;
  dentistReviewRequestNote?: string | null;
  dentistReviewId?: number | null;
  dentistReviewStatus?: string | null;
  dentistReviewResponseNote?: string | null;
}
