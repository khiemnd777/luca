import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import type { NewestOrderModel } from "@features/order/model/newest-order.model";
import { newestList } from "@features/order/api/order.api";
import { priorityColor, priorityLabel } from "@root/shared/utils/order.utils";
import { navigate } from "@root/core/navigation/navigate";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import { invalidate } from "@root/core/hooks/use-async";
import { useEffect } from "react";
import { registerWS } from "@root/core/network/websocket/ws-widgets";
import { OrderCodeText } from "@features/order/components/order-code-text.component";

const columns: ColumnDef<NewestOrderModel>[] = [
  // {
  //   key: "statusLatest",
  //   type: "color",
  //   width: 110,
  //   accessor: (row) => ({ text: statusLabel(row.statusLatest), color: statusColor(row.statusLatest) }),
  // },
  {
    key: "priorityLatest",
    type: "color",
    width: 95,
    accessor: (row) => ({ text: priorityLabel(row.priorityLatest), color: priorityColor(row.priorityLatest) }),
  },
  {
    key: "codeLatest",
    header: "Mã đơn",
    labelField: true,
    render: (row) => <OrderCodeText code={row.codeLatest} />,
  },
  // { key: "code", header: "Mã gốc" },
  { key: "createdAt", header: "Ngày tạo đơn", type: "datetime" },
];

registerTable("order-newest", () => {
  return createTableSchema<NewestOrderModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await newestList(opts),
    initialPageSize: 5,
    initialSort: { by: "created_at", dir: "desc" },
    onView: (row: NewestOrderModel) => { navigate(`/order/${row.id}`) },
  });
});


function NewestOrderWSWidget() {
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === "order:newest") {
      invalidate("order-newest");
    }
  }, [lastMessage]);

  return null;
}

registerWS(<NewestOrderWSWidget />);
