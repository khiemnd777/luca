import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import type { OrderModel } from "@features/order/model/order.model";
import { advancedSearchList, list } from "@features/order/api/order.api";
import { priorityColor, priorityLabel, statusColor, statusLabel } from "@root/shared/utils/order.utils";
import { navigate } from "@root/core/navigation/navigate";
import { getLatestOrderItemIdByOrderId, unlink } from "../api/order-item.api";
import type { OrderAdvancedSearchFilters } from "@features/order/model/order-advanced-search.model";
import { hasAdvancedSearchFilters } from "@features/order/utils/order-advanced-search.store";
import { openFormDialog } from "@core/form/form-dialog.service";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import { createElement, useEffect } from "react";
import { useDebounce } from "@root/core/hooks/use-debounce";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import { registerWS } from "@root/core/network/websocket/ws-widgets";
import { OrderRiskChip } from "@features/order/components/order-risk-chip.component";
import { OrderCodeText } from "@features/order/components/order-code-text.component";

const columns: ColumnDef<OrderModel>[] = [
  {
    key: "statusLatest",
    header: "Trạng thái",
    type: "color",
    width: 110,
    accessor: (row) => ({ text: statusLabel(row.statusLatest), color: statusColor(row.statusLatest) }),
    sortable: true,
  },
  {
    key: "priorityLatest",
    header: "Ưu tiên",
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
    key: "riskBucket",
    header: "Due/Risk",
    width: 130,
    render: (row) => createElement(OrderRiskChip, { row }),
    sortable: false,
  },
  // { key: "code", header: "Mã gốc", sortable: true, },
  {
    key: "remakeCount",
    header: "Làm lại",
    accessor: (row) => row.remakeCount ? `${row.remakeCount} lần` : '––',
    sortable: true,
  },
  // {
  //   key: "",
  //   type: "metadata",
  //   metadata: {
  //     collection: "order",
  //     mode: "whole",
  //   }
  // },
  { key: "clinicName", header: "Nha khoa", sortable: true, },
  { key: "dentistName", header: "Nha sĩ", sortable: true, },
  { key: "patientName", header: "Bệnh nhân", sortable: true, },
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
  { key: "deliveryDate", header: "Ngày giao", type: "datetime", sortable: true, },
  { key: "updatedAt", header: "Cập nhật lúc", type: "datetime", sortable: true, },
  { key: "createdAt", header: "Ngày tạo đơn", type: "datetime", sortable: true, },
];

registerTable("orders", () => {
  return createTableSchema<OrderModel>({
    columns,
    fetch: async (opts: FetchTableOpts & { advancedSearchFilters?: OrderAdvancedSearchFilters }) => {
      const { advancedSearchFilters, ...tableOpts } = opts;
      if (advancedSearchFilters && hasAdvancedSearchFilters(advancedSearchFilters)) {
        return advancedSearchList(advancedSearchFilters, tableOpts);
      }
      return list(tableOpts);
    },
    initialPageSize: 10,
    initialSort: { by: "delivery_date", dir: "asc" },
    // allowUpdating: ["order.update"],
    // allowDeleting: ["order.delete"],
    // onView: (row: OrderModel) => { navigate(`/order/${row.id}`) },
    onEdit: (row: OrderModel) => { navigate(`/order/${row.id}`) },
    rowActions: [
      {
        key: "remake",
        label: "Thêm đơn làm lại",
        icon: createElement(EventRepeatIcon, { fontSize: "small" }),
        permissions: ["order.create"],
        onClick: (row: OrderModel) => openFormDialog("order-remake", { initial: { id: row.id } }),
        sx: {
          color: "#2E7D32",
          "&:hover": {
            backgroundColor: "rgba(46, 125, 50, 0.1)",
          },
        },
      },
    ],
    async onDelete(row) {
      const resolvedOrderItemId = await getLatestOrderItemIdByOrderId(row.id);
      await unlink(row.id, resolvedOrderItemId);
      reloadTable("orders");
    },
  });
});

function OrdersWSWidget() {
  const { lastMessage } = useWebSocket();
  const reloadOrders = useDebounce(() => reloadTable("orders"), 1500);

  useEffect(() => {
    if (
      lastMessage?.type === "order:changed"
      || lastMessage?.type === "order:newest"
      || lastMessage?.type === "order:inprogress"
      || lastMessage?.type === "dashboard:production_planning"
    ) {
      reloadOrders();
    }
  }, [lastMessage, reloadOrders]);

  return null;
}

registerWS(createElement(OrdersWSWidget));
