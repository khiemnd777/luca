import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { createElement } from "react";
import { openFormDialog } from "@core/form/form-dialog.service";
import { navigate } from "@core/navigation/navigate";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import { getLatestOrderItemIdByOrderId, unlink } from "@features/order/api/order-item.api";
import { OrderRiskChip } from "@features/order/components/order-risk-chip.component";
import type { OrderItemHistoricalModel } from "@features/order/model/order-item.model";
import type { OrderModel } from "@features/order/model/order.model";
import { formatDateTime } from "@root/shared/utils/datetime.utils";
import { priorityColor, priorityLabel, statusColor, statusLabel } from "@root/shared/utils/order.utils";

export type GroupedOrderHistoricalDetail = {
  history: OrderItemHistoricalModel;
  detail: OrderModel | null;
};

export type GroupedOrderHistoricalState = {
  status: "idle" | "loading" | "loaded" | "error";
  items: GroupedOrderHistoricalDetail[];
  error?: string | null;
};

type GroupedOrderMasterRow = {
  id: string;
  kind: "master";
  orderId: number;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  totalRemakeCount: number;
  order: OrderModel;
};

type GroupedOrderChildRow = {
  id: string;
  kind: "child";
  orderId: number;
  depth: number;
  totalRemakeCount: number;
  history: OrderItemHistoricalModel;
  detail: OrderModel | null;
};

type GroupedOrderErrorRow = {
  id: string;
  kind: "error";
  orderId: number;
  depth: number;
  message: string;
};

export type GroupedOrderRow = GroupedOrderMasterRow | GroupedOrderChildRow | GroupedOrderErrorRow;

type GroupedOrderTableSchemaOptions = {
  collapsedIds: Set<number>;
  fetchOrders: (opts: FetchTableOpts) => Promise<ListResult<OrderModel>>;
  getHistoricalState: (orderId: number) => GroupedOrderHistoricalState | undefined;
  ensureHistoricalLoaded: (orderId: number) => Promise<GroupedOrderHistoricalState>;
  onToggleExpand: (orderId: number) => void;
};

function getRowOrderSource(row: GroupedOrderRow): OrderModel | null {
  if (row.kind === "master") return row.order;
  if (row.kind === "child") return row.detail;
  return null;
}

function getRowCode(row: GroupedOrderRow): string {
  const source = getRowOrderSource(row);
  const latestOrderItem = source?.latestOrderItem;
  if (
    latestOrderItem &&
    typeof latestOrderItem === "object" &&
    typeof latestOrderItem.code === "string" &&
    latestOrderItem.code.trim()
  ) {
    return latestOrderItem.code;
  }
  if (row.kind === "master") return row.order.codeLatest || row.order.code || "—";
  if (row.kind === "child") return row.history.code || "—";
  return "—";
}

function getRowOriginalCode(row: GroupedOrderRow): string {
  const source = getRowOrderSource(row);
  const latestOrderItem = source?.latestOrderItem;
  if (
    latestOrderItem &&
    typeof latestOrderItem === "object" &&
    typeof latestOrderItem.codeOriginal === "string" &&
    latestOrderItem.codeOriginal.trim()
  ) {
    return latestOrderItem.codeOriginal;
  }
  if (row.kind === "master") return row.order.code || "";
  if (row.kind === "child") return row.detail?.code || "";
  return "";
}

function hasResolvedLatestOrderItem(source: OrderModel | null): boolean {
  const latestOrderItem = source?.latestOrderItem;
  return Boolean(
    latestOrderItem &&
    typeof latestOrderItem === "object" &&
    typeof latestOrderItem.code === "string" &&
    latestOrderItem.code.trim()
  );
}

function getRowRemakeCount(row: GroupedOrderRow): number {
  const source = getRowOrderSource(row);
  const latestOrderItem = source?.latestOrderItem;
  if (
    hasResolvedLatestOrderItem(source) &&
    latestOrderItem &&
    typeof latestOrderItem === "object" &&
    typeof latestOrderItem.remakeCount === "number"
  ) {
    return latestOrderItem.remakeCount;
  }
  if (row.kind === "master") return row.order.remakeCount ?? 0;
  return 0;
}

function getRowDisplayRemakeCount(row: GroupedOrderRow): number {
  const code = getRowCode(row);
  const originalCode = getRowOriginalCode(row);
  const rowRemakeCount = getRowRemakeCount(row);

  if (!code || code === originalCode || rowRemakeCount <= 0) return 0;
  return rowRemakeCount;
}

function buildRowSubtitle(row: GroupedOrderRow): string {
  const originalCode = getRowOriginalCode(row);
  const remakeCount = getRowRemakeCount(row);
  const code = getRowCode(row);

  if (!code || code === "—") return "";
  if (row.kind === "master") return "Đơn hiện tại";
  if (remakeCount <= 0 || code === originalCode) return "Đơn gốc";
  return `Đơn làm lại lần ${remakeCount}`;
}

function renderExpandButton(
  row: GroupedOrderRow,
  onToggleExpand: (orderId: number) => void,
) {
  if (row.kind !== "master" || !row.hasChildren) {
    return <Box sx={{ width: 32, flexShrink: 0 }} />;
  }

  return (
    <IconButton
      size="small"
      onClick={(event) => {
        event.stopPropagation();
        onToggleExpand(row.orderId);
      }}
    >
      {row.isExpanded ? <ExpandMoreRoundedIcon fontSize="small" /> : <ChevronRightRoundedIcon fontSize="small" />}
    </IconButton>
  );
}

function renderCodeCell(row: GroupedOrderRow, onToggleExpand: (orderId: number) => void) {
  if (row.kind === "error") {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: row.depth * 3, minWidth: 0 }}>
        <Box sx={{ width: 32, flexShrink: 0 }} />
        <Typography variant="body2" color="error.main">
          {row.message}
        </Typography>
      </Stack>
    );
  }

  if (row.kind === "child") {
    const childCode = getRowCode(row);

    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: row.depth * 3, minWidth: 0 }}>
        <Box sx={{ width: 32, flexShrink: 0 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
            {childCode || row.history.code}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {buildRowSubtitle(row)}
          </Typography>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: row.depth * 3, minWidth: 0 }}>
      {renderExpandButton(row, onToggleExpand)}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
          {getRowCode(row)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {buildRowSubtitle(row)}
        </Typography>
      </Box>
    </Stack>
  );
}

function renderColorPill(text: string, color: string) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: color,
        color: "common.white",
        border: "1px solid",
        borderColor: "divider",
        fontSize: 12,
        minHeight: 24,
      }}
    >
      {text}
    </Box>
  );
}

function formatCurrency(value?: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("vi-VN");
}

function renderStatusCell(row: GroupedOrderRow) {
  const status = row.kind === "master" ? row.order.statusLatest : row.kind === "child" ? row.detail?.statusLatest : null;
  if (!status) return "—";
  return renderColorPill(statusLabel(status), statusColor(status));
}

function renderPriorityCell(row: GroupedOrderRow) {
  const priority = row.kind === "master" ? row.order.priorityLatest : row.kind === "child" ? row.detail?.priorityLatest : null;
  if (!priority) return "—";
  return renderColorPill(priorityLabel(priority), priorityColor(priority));
}

function getTextValue(row: GroupedOrderRow, accessor: (order: OrderModel) => string | number | null | undefined) {
  const source = getRowOrderSource(row);
  if (!source) return "—";
  const value = accessor(source);
  if (value == null || value === "") return "—";
  return value;
}

function buildRows(
  orders: OrderModel[],
  collapsedIds: Set<number>,
  historicalStates: Record<number, GroupedOrderHistoricalState | undefined>,
): GroupedOrderRow[] {
  const rows: GroupedOrderRow[] = [];

  for (const order of orders) {
    const hasChildren = (order.remakeCount ?? 0) > 0;
    const isExpanded = hasChildren && !collapsedIds.has(order.id);

    rows.push({
      id: `master-${order.id}`,
      kind: "master",
      orderId: order.id,
      depth: 0,
      hasChildren,
      isExpanded,
      totalRemakeCount: order.remakeCount ?? 0,
      order,
    });

    if (!hasChildren || !isExpanded) continue;

    const state = historicalStates[order.id];
    if (!state) continue;

    if (state.status === "error") {
      rows.push({
        id: `error-${order.id}`,
        kind: "error",
        orderId: order.id,
        depth: 1,
        message: state.error || "Không tải được lịch sử đơn hàng",
      });
      continue;
    }

    if (state.status !== "loaded") continue;

    for (const item of state.items) {
      rows.push({
        id: `child-${order.id}-${item.history.id}`,
        kind: "child",
        orderId: order.id,
        depth: 1,
        totalRemakeCount: order.remakeCount ?? 0,
        history: item.history,
        detail: item.detail,
      });
    }
  }

  return rows;
}

export function createGroupedOrderTableSchema({
  collapsedIds,
  fetchOrders,
  getHistoricalState,
  ensureHistoricalLoaded,
  onToggleExpand,
}: GroupedOrderTableSchemaOptions) {
  const columns: ColumnDef<GroupedOrderRow>[] = [
    {
      key: "statusLatest",
      header: "Trạng thái",
      sortable: true,
      width: 110,
      render: renderStatusCell,
    },
    {
      key: "priorityLatest",
      header: "Ưu tiên",
      sortable: true,
      width: 95,
      render: renderPriorityCell,
    },
    {
      key: "codeLatest",
      header: "Mã đơn",
      sortable: true,
      labelField: true,
      width: 280,
      stickyLeft: true,
      render: (row) => renderCodeCell(row, onToggleExpand),
    },
    {
      key: "riskBucket",
      header: "Due/Risk",
      width: 130,
      render: (row) => createElement(OrderRiskChip, { row: getRowOrderSource(row) }),
      sortable: false,
    },
    {
      key: "remakeCount",
      header: "Làm lại",
      sortable: true,
      render: (row) => {
        const remakeCount = getRowDisplayRemakeCount(row);
        return remakeCount > 0 ? `${remakeCount} lần` : "––";
      },
    },
    { key: "clinicName", header: "Nha khoa", sortable: true, render: (row) => getTextValue(row, (order) => order.clinicName) },
    { key: "dentistName", header: "Nha sĩ", sortable: true, render: (row) => getTextValue(row, (order) => order.dentistName) },
    { key: "patientName", header: "Bệnh nhân", sortable: true, render: (row) => getTextValue(row, (order) => order.patientName) },
    {
      key: "processNameLatest",
      header: "Công đoạn",
      sortable: false,
      render: (row) => getTextValue(row, (order) => order.processNameLatest),
    },
    {
      key: "totalPrice",
      header: "Thành tiền",
      sortable: true,
      render: (row) => {
        if (row.kind === "master") return formatCurrency(row.order.totalPrice);
        if (row.kind === "child") return formatCurrency(row.detail?.totalPrice);
        return "—";
      },
    },
    {
      key: "deliveryDate",
      header: "Ngày giao",
      sortable: true,
      render: (row) => {
        if (row.kind === "master") return formatDateTime(row.order.deliveryDate);
        if (row.kind === "child") return formatDateTime(row.detail?.deliveryDate);
        return "—";
      },
    },
    {
      key: "updatedAt",
      header: "Cập nhật lúc",
      sortable: true,
      render: (row) => {
        if (row.kind === "master") return formatDateTime(row.order.updatedAt);
        if (row.kind === "child") return formatDateTime(row.detail?.updatedAt);
        return "—";
      },
    },
    {
      key: "createdAt",
      header: "Ngày tạo đơn",
      sortable: true,
      render: (row) => {
        if (row.kind === "master") return formatDateTime(row.order.createdAt);
        if (row.kind === "child") return formatDateTime(row.detail?.createdAt ?? row.history.createdAt);
        return "—";
      },
    },
  ];

  return createTableSchema<GroupedOrderRow>({
    columns,
    fetch: async (opts) => {
      const result = await fetchOrders(opts);
      const expandedOrderIDs = result.items
        .filter((order) => (order.remakeCount ?? 0) > 0 && !collapsedIds.has(order.id))
        .map((order) => order.id);

      const historicalEntries = await Promise.all(
        expandedOrderIDs.map(async (orderId) => [orderId, await ensureHistoricalLoaded(orderId)] as const)
      );
      const fetchedHistoricalStates = Object.fromEntries(historicalEntries) as Record<number, GroupedOrderHistoricalState>;

      return {
        items: buildRows(result.items, collapsedIds, {
          ...Object.fromEntries(result.items.map((order) => [order.id, getHistoricalState(order.id)] as const)),
          ...fetchedHistoricalStates,
        }),
        total: result.total,
      };
    },
    initialPageSize: 10,
    initialSort: { by: "created_at", dir: "desc" },
    onEdit: (row) => {
      if (row.kind !== "master") return;
      navigate(`/order/${row.orderId}`);
    },
    canEdit: (row) => row.kind === "master",
    async onDelete(row) {
      if (row.kind !== "master") return;
      const resolvedOrderItemId = await getLatestOrderItemIdByOrderId(row.orderId);
      await unlink(row.orderId, resolvedOrderItemId);
    },
    canDelete: (row) => row.kind === "master",
    onRowClick: (row) => {
      if (row.kind === "master") {
        navigate(`/order/${row.orderId}`);
        return;
      }

      if (row.kind === "child") {
        navigate(`/order/${row.orderId}/historical/${row.history.id}`);
      }
    },
    rowActions: [
      {
        key: "remake",
        label: "Thêm đơn làm lại",
        icon: createElement(EventRepeatIcon, { fontSize: "small" }),
        permissions: ["order.create"],
        visible: (row) => row.kind === "master",
        onClick: (row) => {
          if (row.kind !== "master") return;
          openFormDialog("order-remake", { initial: { id: row.orderId } });
        },
        sx: {
          color: "#2E7D32",
          "&:hover": {
            backgroundColor: "rgba(46, 125, 50, 0.1)",
          },
        },
      },
    ],
  });
}
