import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import type { OrderItemProcessInProgressProcessModel } from "@features/order/model/order-item-process-inprogress-process.model";

export type StaffProcessTableProps = {
  rows: OrderItemProcessInProgressProcessModel[];
  loading?: boolean;
};

const columns: GridColDef<OrderItemProcessInProgressProcessModel>[] = [
  {
    field: "orderItemCode",
    headerName: "Order Item",
    flex: 1.2,
    minWidth: 140,
    valueGetter: (_, row) => row.orderItemCode ?? "",
  },
  {
    field: "processName",
    headerName: "Process",
    flex: 1,
    minWidth: 140,
    valueGetter: (_, row) => row.processName ?? "",
  },
  {
    field: "startedAt",
    headerName: "Started",
    flex: 1,
    minWidth: 180,
    valueGetter: (_, row) => row.startedAt ? new Date(row.startedAt).toLocaleString() : "",
  },
  {
    field: "completedAt",
    headerName: "Completed",
    flex: 1,
    minWidth: 180,
    valueGetter: (_, row) => row.completedAt ? new Date(row.completedAt).toLocaleString() : "",
  },
];

export function StaffProcessTable({ rows, loading }: StaffProcessTableProps) {
  return (
    <DataGrid
      autoHeight
      rows={rows}
      columns={columns}
      loading={loading}
      getRowId={(row) => row.id ?? `${row.orderItemId ?? "na"}-${row.processName ?? "process"}-${row.startedAt ?? "na"}`}
      disableRowSelectionOnClick
      pageSizeOptions={[10, 25, 50]}
      initialState={{
        pagination: { paginationModel: { pageSize: 10, page: 0 } },
      }}
    />
  );
}
