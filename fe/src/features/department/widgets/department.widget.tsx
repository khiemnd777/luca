/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import AddIcon from "@mui/icons-material/Add";
import { Button, Stack } from "@mui/material";
import { openFormDialog } from "@core/form/form-dialog.service";
import { IfPermission } from "@core/auth/if-permission";
import { useAsync } from "@core/hooks/use-async";
import { registerSlot } from "@core/module/registry";
import { subscribeTableReload } from "@core/table/table-reload";
import { AutoTable } from "@core/table/auto-table";
import { EmptyState } from "@shared/components/ui/empty-state";
import { Loading } from "@shared/components/ui/loading";
import { SectionCard } from "@root/shared/components/ui/section-card";
import { DepartmentDashboardDialog } from "@features/dashboard/components/department-dashboard-dialog";
import { list } from "@features/department/api/department.api";
import { DepartmentSyncReviewDialog } from "@features/department/components/department-sync-review.dialog";
import { useDepartmentDashboardDialogStore } from "@features/department/model/department-dashboard-dialog.store";
import {
  createDepartmentTreeTableSchema,
} from "@features/department/tables/department.table";
import {
  buildDepartmentTree,
  collectExpandableDepartmentIds,
  flattenDepartmentTree,
  type DepartmentTreeNode,
} from "@features/department/utils/department-tree.utils";

const LIST_CHANNEL = "department-children";
const LIST_FETCH_LIMIT = 1000;

function DeparmentWidget() {
  const { open, departmentId, departmentName, closeDialog, openDialog } = useDepartmentDashboardDialogStore();
  const [expandedIds, setExpandedIds] = React.useState<Set<number>>(new Set());
  const [syncingRow, setSyncingRow] = React.useState<DepartmentTreeNode | null>(null);

  const { data, loading, error, reload } = useAsync(async () => {
    return await list({
      limit: LIST_FETCH_LIMIT,
      page: 1,
      orderBy: "id",
      direction: "asc",
    });
  }, []);

  const tree = React.useMemo(() => buildDepartmentTree(data?.items ?? []), [data?.items]);
  const rows = React.useMemo(() => flattenDepartmentTree(tree, expandedIds), [expandedIds, tree]);

  React.useEffect(() => {
    setExpandedIds(new Set(collectExpandableDepartmentIds(tree)));
  }, [tree]);

  React.useEffect(() => {
    const unsubscribe = subscribeTableReload(LIST_CHANNEL, () => {
      void reload();
    });
    return unsubscribe;
  }, [reload]);

  const handleToggleExpand = React.useCallback((rowId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  const handleAddRoot = React.useCallback(() => {
    openFormDialog("department");
  }, []);

  const handleAddChild = React.useCallback((row: DepartmentTreeNode) => {
    openFormDialog("department", { initial: { parentId: row.id } });
  }, []);

  const treeSchema = React.useMemo(
    () =>
      createDepartmentTreeTableSchema({
        rows,
        expandedIds,
        onToggleExpand: handleToggleExpand,
        onOpenReport: openDialog,
        onAddChild: handleAddChild,
        onOpenSync: setSyncingRow,
      }),
    [expandedIds, handleAddChild, handleToggleExpand, openDialog, rows]
  );

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
          <AutoTable schema={treeSchema} />
        )}
      </SectionCard>

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
