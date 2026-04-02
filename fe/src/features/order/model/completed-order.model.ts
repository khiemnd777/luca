export interface CompletedOrderModel {
  id: number;
  code?: string | null;
  codeLatest?: string | null;
  createdAt?: string | null;
  statusLatest?: string | null;
  priorityLatest?: string | null;
}
