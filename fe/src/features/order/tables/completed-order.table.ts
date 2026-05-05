import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import type { CompletedOrderModel } from "@features/order/model/completed-order.model";
import { completedList } from "@features/order/api/order.api";
import { navigate } from "@root/core/navigation/navigate";
import { createElement } from "react";
import { OrderCodeText } from "@features/order/components/order-code-text.component";

const columns: ColumnDef<CompletedOrderModel>[] = [
  // {
  //   key: "priorityLatest",
  //   type: "color",
  //   width: 95,
  //   accessor: (row) => ({ text: priorityLabel(row.priorityLatest), color: priorityColor(row.priorityLatest) }),
  // },
  {
    key: "codeLatest",
    header: "Mã đơn",
    labelField: true,
    render: (row) => createElement(OrderCodeText, { code: row.codeLatest }),
  },
  // { key: "createdAt", header: "Ngày tạo đơn", type: "datetime" },
];

registerTable("order-completed", () => {
  return createTableSchema<CompletedOrderModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await completedList(opts),
    initialPageSize: 5,
    initialSort: { by: "created_at", dir: "desc" },
    onView: (row: CompletedOrderModel) => { navigate(`/order/${row.id}`); },
  });
});
