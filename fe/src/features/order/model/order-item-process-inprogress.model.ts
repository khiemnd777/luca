
export interface OrderItemProcessInProgressModel {
  id?: number;
  processId?: number | null;
  prevProcessId?: number | null;
  nextProcessId?: number | null;
  orderItemCode?: string | null;
  checkInNote?: string | null;
  checkOutNote?: string | null;
  orderItemId?: number | null;
  orderId?: number | null;
  assignedId?: number | null;
  assignedName?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string;
}
