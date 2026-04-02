import { Chip } from "@mui/material";
import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { getLogs } from "@features/observability_logs/api/system-logs.api";
import type { SystemLogModel, SystemLogsFilters } from "@features/observability_logs/model/system-log.model";
import { formatDateTime } from "@shared/utils/datetime.utils";

function levelChipColor(level?: string): "warning" | "error" | "info" | "default" {
  switch ((level ?? "").toLowerCase()) {
    case "warn":
      return "warning";
    case "error":
    case "fatal":
      return "error";
    case "debug":
    case "info":
      return "info";
    default:
      return "default";
  }
}

const columns: ColumnDef<SystemLogModel>[] = [
  {
    key: "ts",
    header: "Thời gian",
    width: 180,
    sortable: true,
    stickyLeft: true,
    render: (row) => formatDateTime(row.ts),
  },
  {
    key: "level",
    header: "Mức độ",
    width: 120,
    render: (row) => (
      <Chip
        size="small"
        label={(row.level || "unknown").toUpperCase()}
        color={levelChipColor(row.level)}
        variant={row.level === "warn" || row.level === "error" || row.level === "fatal" ? "filled" : "outlined"}
      />
    ),
  },
  {
    key: "module",
    header: "Module",
    width: 160,
    sortable: true,
  },
  {
    key: "message",
    header: "Message",
    width: 420,
    render: (row) => (
      <span
        title={row.message}
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          display: "inline-block",
          width: "100%",
        }}
      >
        {row.message}
      </span>
    ),
  },
  {
    key: "requestId",
    header: "Request ID",
    width: 180,
  },
  {
    key: "userId",
    header: "User ID",
    width: 120,
  },
  {
    key: "departmentId",
    header: "Department ID",
    width: 140,
  },
];

registerTable("system-logs", () =>
  createTableSchema<SystemLogModel>({
    columns,
    fetch: async (opts: FetchTableOpts & Record<string, any>) => {
      const filters = opts as FetchTableOpts & SystemLogsFilters;
      return getLogs({
        ...filters,
        direction: filters.direction === "asc" ? "forward" : "backward",
      });
    },
    initialPageSize: 50,
    initialSort: { by: "ts", dir: "desc" },
    dense: true,
    stickyHeader: true,
  })
);
