
export interface OrderItemProcessTargetModel {
  id?: number;
  processId?: number | null;
  prevProcessId?: number | null;
  nextProcessId?: number | null;
  orderItemId?: number | null;
  orderId?: number | null;
  orderItemCode?: string | null;
  productId?: number | null;
  productCode?: string | null;
  productName?: string | null;
  processName?: string | null;
  sectionId?: number | null;
  sectionName?: string | null;
  assignedId?: number | null;
  assignedName?: string | null;
  checkInNote?: string | null;
  checkOutNote?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  mode?: string | null;
  requiresDentistReview?: boolean | null;
  dentistReviewRequestNote?: string | null;
  dentistReviewId?: number | null;
  dentistReviewStatus?: string | null;
  dentistReviewResponseNote?: string | null;
  dentistReview?: OrderItemProcessDentistReviewModel | null;
}

export type OrderItemProcessDentistReviewResult = "approved" | "rejected";

export interface OrderItemProcessDentistReviewModel {
  id?: number | null;
  orderId?: number | null;
  orderItemId?: number | null;
  orderItemCode?: string | null;
  productId?: number | null;
  productCode?: string | null;
  productName?: string | null;
  processId?: number | null;
  processName?: string | null;
  inProgressId?: number | null;
  result?: OrderItemProcessDentistReviewResult | string | null;
  status?: string | null;
  requestNote?: string | null;
  note?: string | null;
  responseNote?: string | null;
  requestedBy?: number | null;
  resolvedBy?: number | null;
  requestedAt?: string | null;
  resolvedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface OrderItemProcessInProgressModel {
  id?: number;
  processId?: number | null;
  processName?: string | null;
  prevProcessId?: number | null;
  nextProcessId?: number | null;
  orderItemCode?: string | null;
  checkInNote?: string | null;
  checkOutNote?: string | null;
  orderItemId?: number | null;
  orderId?: number | null;
  productId?: number | null;
  productCode?: string | null;
  productName?: string | null;
  sectionId?: number | null;
  sectionName?: string | null;
  assignedId?: number | null;
  assignedName?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string;
  availableTargets?: OrderItemProcessTargetModel[] | null;
  mode?: string | null;
  requiresDentistReview?: boolean | null;
  dentistReviewRequestNote?: string | null;
  dentistReviewId?: number | null;
  dentistReviewStatus?: string | null;
  dentistReviewResponseNote?: string | null;
  dentistReview?: OrderItemProcessDentistReviewModel | null;
}
