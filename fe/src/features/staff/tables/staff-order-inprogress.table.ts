import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { getInProgressesForStaff } from "@features/order/api/order-item-process.api";
import type { OrderItemProcessInProgressProcessModel } from "@features/order/model/order-item-process-inprogress-process.model";

const formatProcessLabel = (row: OrderItemProcessInProgressProcessModel) => {
  const section = row.sectionName ? `${row.sectionName} > ` : "";
  const process = row.processName ?? "";
  return `${section}${process}`.trim();
};

const columns: ColumnDef<OrderItemProcessInProgressProcessModel>[] = [
  { 
    key: "orderItemCode", 
    type: "link", 
    header: "Mã đơn hàng", 
    url: (r) => `/order/${r.orderId}/historical/${r.orderItemId}`
  },
  {
    key: "processName",
    header: "Công đoạn",
    type: "color",
    accessor: (row) => ({ text: formatProcessLabel(row), color: row.color }),
  },
  { key: "assignedName", header: "Kỹ thuật viên", width: 180, },
  { key: "startedAt", header: "Bắt đầu lúc", type: "datetime" },
  { key: "completedAt", header: "Hoàn thành lúc", type: "datetime" },
  // { key: "checkInNote", header: "Ghi chú nhận ca", width: 300 },
  // { key: "checkOutNote", header: "Ghi chú giao ca", width: 300 },
];

registerTable("staff-order-inprogress", () =>
  createTableSchema<OrderItemProcessInProgressProcessModel>({
    columns,
    fetch: async (opts: FetchTableOpts & Record<string, any>) =>
      await getInProgressesForStaff(opts.staffId, opts),
    initialPageSize: 10,
    initialSort: { by: "started_at", dir: "desc" },
  })
);
