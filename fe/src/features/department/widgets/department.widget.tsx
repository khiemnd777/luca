/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import AddIcon from "@mui/icons-material/Add";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import SyncAltOutlinedIcon from "@mui/icons-material/SyncAltOutlined";
import {
  Box,
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { openFormDialog } from "@core/form/form-dialog.service";
import { IfPermission } from "@core/auth/if-permission";
import { registerSlot } from "@core/module/registry";
import { navigate } from "@core/navigation/navigate";
import { subscribeTableReload } from "@core/table/table-reload";
import { useAsync } from "@core/hooks/use-async";
import { Loading } from "@shared/components/ui/loading";
import { EmptyState } from "@shared/components/ui/empty-state";
import { ConfirmDialog } from "@shared/components/dialog/confirm-dialog";
import { SectionCard } from "@root/shared/components/ui/section-card";
import { formatDateTime } from "@root/shared/utils/datetime.utils";
import { DepartmentDashboardDialog } from "@features/dashboard/components/department-dashboard-dialog";
import { list, unlink } from "@features/department/api/department.api";
import { DepartmentSyncReviewDialog } from "@features/department/components/department-sync-review.dialog";
import { useDepartmentDashboardDialogStore } from "@features/department/model/department-dashboard-dialog.store";
import {
  buildDepartmentTree,
  collectExpandableDepartmentIds,
  flattenDepartmentTree,
  type DepartmentTreeNode,
} from "@features/department/utils/department-tree.utils";

const LIST_CHANNEL = "department-children";
const LIST_FETCH_LIMIT = 1000;
const PROTECTED_DEPARTMENT_ID = 1;

function DepartmentTreeTable({
  rows,
  onAddChild,
  onEdit,
  onDelete,
  onSync,
  onOpenReport,
  expandedIds,
  onToggleExpand,
}: {
  rows: DepartmentTreeNode[];
  onAddChild: (row: DepartmentTreeNode) => void;
  onEdit: (row: DepartmentTreeNode) => void;
  onDelete: (row: DepartmentTreeNode) => void;
  onSync: (row: DepartmentTreeNode) => void;
  onOpenReport: (row: DepartmentTreeNode) => void;
  expandedIds: Set<number>;
  onToggleExpand: (rowId: number) => void;
}) {
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: 980 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Chi nhánh</TableCell>
            <TableCell sx={{ fontWeight: 600, width: 160 }}>Số điện thoại</TableCell>
            <TableCell sx={{ fontWeight: 600, width: 180 }}>Email</TableCell>
            <TableCell sx={{ fontWeight: 600, width: 140 }}>Mã số thuế</TableCell>
            <TableCell sx={{ fontWeight: 600, width: 240 }}>Địa chỉ</TableCell>
            <TableCell sx={{ fontWeight: 600, width: 120 }}>Kích hoạt</TableCell>
            <TableCell sx={{ fontWeight: 600, width: 180 }}>Cập nhật lúc</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, width: 220 }}>Thao tác</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const isExpanded = expandedIds.has(row.id);

            return (
              <TableRow hover key={row.id}>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: row.depth * 3 }}>
                    {row.hasChildren ? (
                      <IconButton size="small" onClick={() => onToggleExpand(row.id)}>
                        {isExpanded ? <ExpandMoreRoundedIcon fontSize="small" /> : <ChevronRightRoundedIcon fontSize="small" />}
                      </IconButton>
                    ) : (
                      <Box sx={{ width: 32, display: "flex", justifyContent: "center", color: "text.disabled" }}>
                        <AccountTreeOutlinedIcon fontSize="small" />
                      </Box>
                    )}

                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: "text.primary",
                          cursor: "pointer",
                        }}
                        onClick={() => onEdit(row)}
                      >
                        {row.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID #{row.id}
                        {row.parentId ? ` • Cha #${row.parentId}` : " • Gốc"}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>{row.phoneNumber?.trim() || "—"}</TableCell>
                <TableCell>{row.email || "—"}</TableCell>
                <TableCell>{row.tax || "—"}</TableCell>
                <TableCell>{row.address || "—"}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {row.active ? (
                      <CheckRoundedIcon fontSize="small" color="success" />
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{formatDateTime(row.updatedAt) || "—"}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <IfPermission permissions={["order.view"]}>
                      <Tooltip title="Xem báo cáo">
                        <IconButton size="small" color="primary" onClick={() => onOpenReport(row)}>
                          <AssessmentOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </IfPermission>

                    <IfPermission permissions={["department.create"]}>
                      <Tooltip title="Thêm chi nhánh con">
                        <IconButton size="small" color="primary" onClick={() => onAddChild(row)}>
                          <AddCircleOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </IfPermission>

                    <IfPermission permissions={["department.update"]}>
                      {row.parentId ? (
                        <Tooltip title="Sync từ chi nhánh cha">
                          <IconButton size="small" color="primary" onClick={() => onSync(row)}>
                            <SyncAltOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </IfPermission>

                    <IfPermission permissions={["department.update"]}>
                      <Tooltip title="Chỉnh sửa">
                        <IconButton size="small" onClick={() => onEdit(row)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </IfPermission>

                    {row.id !== PROTECTED_DEPARTMENT_ID && (
                      <IfPermission permissions={["department.delete"]}>
                        <Tooltip title="Xóa">
                          <IconButton size="small" color="error" onClick={() => onDelete(row)}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </IfPermission>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}

function DeparmentWidget() {
  const { open, departmentId, departmentName, closeDialog, openDialog } = useDepartmentDashboardDialogStore();
  const [expandedIds, setExpandedIds] = React.useState<Set<number>>(new Set());
  const [deletingRow, setDeletingRow] = React.useState<DepartmentTreeNode | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [syncingRow, setSyncingRow] = React.useState<DepartmentTreeNode | null>(null);

  const { data, loading, error, reload } = useAsync(async () => {
    return await list({
      limit: LIST_FETCH_LIMIT,
      page: 1,
      orderBy: "id",
      direction: "asc",
    });
  }, []);

  const tree = buildDepartmentTree(data?.items ?? []);
  const rows = flattenDepartmentTree(tree, expandedIds);

  React.useEffect(() => {
    setExpandedIds(new Set(collectExpandableDepartmentIds(tree)));
  }, [data?.items]);

  React.useEffect(() => {
    const unsubscribe = subscribeTableReload(LIST_CHANNEL, () => {
      void reload();
    });
    return unsubscribe;
  }, [reload]);

  const handleToggleExpand = (rowId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const handleAddRoot = () => {
    openFormDialog("department");
  };

  const handleAddChild = (row: DepartmentTreeNode) => {
    openFormDialog("department", { initial: { parentId: row.id } });
  };

  const handleEdit = (row: DepartmentTreeNode) => {
    navigate(`/department/${row.id}`);
  };

  const handleDelete = async () => {
    if (!deletingRow?.id) return;
    setDeleting(true);
    try {
      await unlink(deletingRow.id);
      setDeletingRow(null);
      await reload();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <SectionCard
        title="Chi nhánh"
        extra={
          <Stack direction="row" spacing={1}>
            <IfPermission permissions={["department.create"]}>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddRoot}>
                Thêm chi nhánh
              </Button>
            </IfPermission>
          </Stack>
        }
      >
        {loading ? (
          <Loading text="Đang tải cây chi nhánh..." />
        ) : error ? (
          <EmptyState
            title="Không tải được danh sách chi nhánh"
            description={error instanceof Error ? error.message : "Xin thử lại sau."}
            actionText="Tải lại"
            onAction={() => void reload()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<AccountTreeOutlinedIcon fontSize="inherit" />}
            title="Chưa có chi nhánh"
            description="Danh sách chi nhánh đang trống."
            actionText="Thêm chi nhánh"
            onAction={handleAddRoot}
          />
        ) : (
          <DepartmentTreeTable
            rows={rows}
            expandedIds={expandedIds}
            onToggleExpand={handleToggleExpand}
            onAddChild={handleAddChild}
            onEdit={handleEdit}
            onDelete={setDeletingRow}
            onSync={setSyncingRow}
            onOpenReport={openDialog}
          />
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!deletingRow}
        confirming={deleting}
        onClose={() => {
          if (!deleting) setDeletingRow(null);
        }}
        onConfirm={() => void handleDelete()}
        title="Xóa chi nhánh này?"
        content={
          deletingRow
            ? <>Bạn có chắc muốn xóa&nbsp;<b>{deletingRow.name}</b>&nbsp;không? Hành động này không thể hoàn tác.</>
            : "Bạn có chắc muốn xóa chi nhánh này không?"
        }
        confirmText="Xóa"
        cancelText="Hủy"
      />

      <DepartmentSyncReviewDialog
        open={Boolean(syncingRow)}
        departmentId={syncingRow?.id}
        departmentName={syncingRow?.name}
        onClose={() => setSyncingRow(null)}
        onApplied={async () => {
          await reload();
        }}
      />

      <DepartmentDashboardDialog
        open={open}
        departmentId={departmentId}
        departmentName={departmentName}
        onClose={closeDialog}
      />
    </>
  );
}

registerSlot({
  id: "department",
  name: "department:left",
  render: () => <DeparmentWidget />,
});
