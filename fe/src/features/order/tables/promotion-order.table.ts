import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import type { OrderModel } from "@features/order/model/order.model";
import { listByPromotionCodeID } from "@features/order/api/order.api";
import { priorityColor, priorityLabel, statusColor, statusLabel } from "@root/shared/utils/order.utils";
import { navigate } from "@root/core/navigation/navigate";
import { getLatestOrderItemIdByOrderId, unlink } from "../api/order-item.api";
import { createElement } from "react";
import { OrderCodeText } from "@features/order/components/order-code-text.component";

const columns: ColumnDef<OrderModel>[] = [
  {
    key: "statusLatest",
    type: "color",
    width: 110,
    accessor: (row) => ({ text: statusLabel(row.statusLatest), color: statusColor(row.statusLatest) }),
    sortable: true,
  },
  {
    key: "priorityLatest",
    type: "color",
    width: 95,
    accessor: (row) => ({ text: priorityLabel(row.priorityLatest), color: priorityColor(row.priorityLatest) }),
    sortable: true,
  },
  {
    key: "codeLatest",
    header: "Mã đơn",
    sortable: true,
    labelField: true,
    render: (row) => createElement(OrderCodeText, { code: row.codeLatest || row.code }),
  },
  {
    key: "remakeCount",
    header: "Làm lại",
    accessor: (row) => row.remakeCount ? `${row.remakeCount} lần` : "––",
    sortable: true,
  },
  { key: "clinicName", header: "Nha khoa", sortable: true },
  { key: "dentistName", header: "Nha sĩ", sortable: true },
  { key: "patientName", header: "Bệnh nhân", sortable: true },
  {
    key: "processNameLatest",
    header: "Công đoạn",
  },
  {
    key: "totalPrice",
    type: "currency",
    header: "Thành tiền",
    sortable: true,
  },
  { key: "deliveryDate", header: "Ngày giao", type: "datetime", sortable: true },
  { key: "updatedAt", header: "Cập nhật lúc", type: "datetime", sortable: true },
  { key: "createdAt", header: "Ngày tạo đơn", type: "datetime", sortable: true },
];

registerTable("promotion-orders", () => {
  return createTableSchema<OrderModel>({
    columns,
    fetch: async (opts: FetchTableOpts & Record<string, any>) => await listByPromotionCodeID(opts.promotionCodeId, opts),
    initialPageSize: 10,
    initialSort: { by: "updated_at", dir: "desc" },
    onView: (row: OrderModel) => { navigate(`/order/${row.id}`); },
    async onDelete(row) {
      const resolvedOrderItemId = await getLatestOrderItemIdByOrderId(row.id);
      await unlink(row.id, resolvedOrderItemId);
      reloadTable("orders");
    },
  });
});
