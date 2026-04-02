export interface OrderItemProcessInProgressProcessModel {
  id?: number;
  orderId?: number | null;
  orderItemId?: number | null;
  orderItemCode?: string | null;
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
}
