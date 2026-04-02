import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import type { OrderItemMaterialModel } from "@features/order/model/order-item-material.model";
import { getOrderLoanerMaterials } from "@features/order/api/order-item-material.api";
import { materialStatusLabel } from "../../material/utils/material.utils";

const columns: ColumnDef<OrderItemMaterialModel>[] = [
  {
    key: "orderItemCode",
    header: "Mã đơn hàng",
    type: "link",
    url: (r) => `/order/${r.orderId}/historical/${r.orderItemId}`,
  },
  { key: "materialName", header: "Tên vật tư", sortable: true },
  { key: "clinicName", header: "Nha khoa", sortable: true },
  { key: "dentistName", header: "Nha sĩ", sortable: true },
  { key: "patientName", header: "Khách hàng", sortable: true },
  {
    key: "quantity",
    header: "Số lượng",
    accessor: (row) => `x${row.quantity}`,
  },
  {
    key: "status",
    header: "Trạng thái",
    accessor: (r) => materialStatusLabel(r.status),
  },
  { key: "onLoanAt", header: "Ngày mượn", type: "datetime", sortable: true },
  { key: "returnedAt", header: "Ngày trả", type: "datetime", sortable: true },
];

registerTable("order-loaner-materials-on-loan", () => {
  return createTableSchema<OrderItemMaterialModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await getOrderLoanerMaterials(opts),
    allowUpdating: ["order.update"],
  });
});
