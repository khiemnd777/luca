export interface OrderItemMaterialModel {
  id: number;
  materialCode?: string | null;
  materialName?: string | null;
  materialId?: number | null;
  orderItemId?: number | null;
  orderItemCode?: string | null;
  orderId?: number | null;
  quantity: number;
  retailPrice?: number | null;
  type?: string | null;
  status?: string | null;
  isCloneable?: boolean | null;
  note?: string | null;
  clinicId?: number | null;
  clinicName?: string | null;
  dentistId?: number | null;
  dentistName?: string | null;
  patientId?: number | null;
  patientName?: string | null;
  onLoanAt?: string | null;
  returnedAt?: string | null;
}
