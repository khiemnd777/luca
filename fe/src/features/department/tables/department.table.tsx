import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SyncAltOutlinedIcon from "@mui/icons-material/SyncAltOutlined";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { createElement } from "react";
import { navigate } from "@core/navigation/navigate";
import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { childrenList, unlink } from "@features/department/api/department.api";
import type { DeparmentModel } from "@features/department/model/department.model";
import {
  getPrimaryDepartmentPhoneNumber,
} from "@features/department/utils/department-phone.utils";
import type { DepartmentTreeNode } from "@features/department/utils/department-tree.utils";

const PROTECTED_DEPARTMENT_ID = 1;

type DepartmentTreeTableSchemaOptions = {
  rows: DepartmentTreeNode[];
  expandedIds: Set<number>;
  onToggleExpand: (rowId: number) => void;
  onOpenReport: (row: DepartmentTreeNode) => void;
  onAddChild: (row: DepartmentTreeNode) => void;
  onOpenSync: (row: DepartmentTreeNode) => void;
};

function renderDepartmentNameCell(
  row: DepartmentTreeNode,
  expandedIds: Set<number>,
  onToggleExpand: (rowId: number) => void,
) {
  const isExpanded = expandedIds.has(row.id);

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: row.depth * 3, minWidth: 0 }}>
      {row.hasChildren ? (
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpand(row.id);
          }}
        >
          {isExpanded ? <ExpandMoreRoundedIcon fontSize="small" /> : <ChevronRightRoundedIcon fontSize="small" />}
        </IconButton>
      ) : (
        <Box sx={{ width: 32, flexShrink: 0 }} />
      )}

      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
          {row.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ID #{row.id}
          {row.parentId ? ` • Cha #${row.parentId}` : " • Gốc"}
        </Typography>
      </Box>
    </Stack>
  );
}

function renderDepartmentAddressCell(address?: string | null) {
  return (
    <Typography
      variant="body2"
      sx={{
        whiteSpace: "normal",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        lineHeight: 1.4,
      }}
    >
      {address || "—"}
    </Typography>
  );
}

export function createDepartmentTreeTableSchema({
  rows,
  expandedIds,
  onToggleExpand,
  onOpenReport,
  onAddChild,
  onOpenSync,
}: DepartmentTreeTableSchemaOptions) {
  const columns: ColumnDef<DepartmentTreeNode>[] = [
    {
      key: "name",
      header: "Chi nhánh",
      sortable: false,
      labelField: true,
      width: 360,
      stickyLeft: true,
      render: (row) => renderDepartmentNameCell(row, expandedIds, onToggleExpand),
    },
    {
      key: "phoneNumber",
      header: "Số điện thoại",
      sortable: false,
      width: 160,
      accessor: (row) => getPrimaryDepartmentPhoneNumber(row),
      render: (row) => getPrimaryDepartmentPhoneNumber(row) || "—",
    },
    { key: "email", header: "Email", sortable: false, width: 200, render: (row) => row.email || "—" },
    { key: "tax", header: "Mã số thuế", sortable: false, width: 160, render: (row) => row.tax || "—" },
    {
      key: "address",
      header: "Địa chỉ",
      sortable: false,
      width: 260,
      render: (row) => renderDepartmentAddressCell(row.address),
    },
    { key: "active", header: "Kích hoạt", type: "boolean", sortable: false, width: 120 },
    { key: "updatedAt", header: "Cập nhật lúc", type: "datetime", sortable: false, width: 180 },
  ];

  return createTableSchema<DepartmentTreeNode>({
    columns,
    fetch: async () => {
      return {
        items: rows,
        total: rows.length,
      };
    },
    initialPageSize: 1000,
    initialSort: { by: "id", dir: "asc" },
    hidePagination: true,
    allowUpdating: ["department.update"],
    allowDeleting: ["department.delete"],
    canDelete: (row) => Number(row.id) !== PROTECTED_DEPARTMENT_ID,
    onRowClick(row) {
      navigate(`/department/${row.id}`);
    },
    onEdit(row) {
      navigate(`/department/${row.id}`);
    },
    async onDelete(row) {
      if (Number(row.id) === PROTECTED_DEPARTMENT_ID) return;
      await unlink(Number(row.id));
    },
    rowActions: [
      {
        key: "report",
        label: "Xem báo cáo",
        icon: createElement(AssessmentOutlinedIcon, { fontSize: "small" }),
        permissions: ["order.view"],
        onClick: async (row) => {
          onOpenReport(row);
        },
      },
      {
        key: "add-child",
        label: "Thêm chi nhánh con",
        icon: createElement(AddCircleOutlineRoundedIcon, { fontSize: "small" }),
        permissions: ["department.create"],
        onClick: async (row) => {
          onAddChild(row);
        },
      },
      {
        key: "sync-from-parent",
        label: "Sync từ chi nhánh cha",
        icon: createElement(SyncAltOutlinedIcon, { fontSize: "small" }),
        permissions: ["department.update"],
        visible: (row) => !!row.parentId,
        onClick: async (row) => {
          onOpenSync(row);
        },
      },
    ],
  });
}

const columns: ColumnDef<DeparmentModel>[] = [
  { key: "name", header: "Tên chi nhánh", sortable: true, labelField: true },
  {
    key: "phoneNumber",
    header: "Số điện thoại",
    sortable: false,
    accessor: (row) => getPrimaryDepartmentPhoneNumber(row),
    render: (row) => getPrimaryDepartmentPhoneNumber(row),
  },
  { key: "email", header: "Email", sortable: true },
  { key: "tax", header: "Mã số thuế", sortable: true },
  {
    key: "address",
    header: "Địa chỉ",
    sortable: true,
    render: (row) => renderDepartmentAddressCell(row.address),
  },
  { key: "active", header: "Kích hoạt", type: "boolean", sortable: true },
  { key: "updatedAt", header: "Cập nhật lúc", type: "datetime", sortable: true },
];

registerTable("department-children", () =>
  createTableSchema<DeparmentModel>({
    columns,
    fetch: async (opts: FetchTableOpts & { deptId?: number }) => {
      return childrenList(opts);
    },
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["department.update"],
    allowDeleting: ["department.delete"],
    canDelete: (row) => Number(row.id) !== PROTECTED_DEPARTMENT_ID,
    onEdit(row) {
      navigate(`/department/${row.id}`);
    },
    async onDelete(row) {
      if (Number(row.id) === PROTECTED_DEPARTMENT_ID) return;
      await unlink(Number(row.id));
    },
    rowActions: [],
  })
);
