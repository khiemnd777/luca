import * as React from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@shared/components/dialog/confirm-dialog";
import {
  applySyncFromParent,
  previewSyncFromParent,
} from "@features/department/api/department.api";
import type {
  DepartmentSyncApplyResultModel,
  DepartmentSyncModuleDiffModel,
  DepartmentSyncPreviewModel,
} from "@features/department/model/department-sync.model";

type Props = {
  open: boolean;
  departmentId?: number | null;
  departmentName?: string | null;
  onClose: () => void;
  onApplied?: (result: DepartmentSyncApplyResultModel) => void | Promise<void>;
};

const CHANGE_TYPE_LABEL: Record<string, string> = {
  create: "Tạo mới",
  update: "Cập nhật",
  skip: "Bỏ qua",
};

const CHANGE_TYPE_COLOR: Record<string, "success" | "warning" | "default"> = {
  create: "success",
  update: "warning",
  skip: "default",
};

function Summary({ preview }: { preview: DepartmentSyncPreviewModel }) {
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }}>
      <Chip color="success" variant="outlined" label={`Tạo mới ${preview.totalCreate}`} />
      <Chip color="warning" variant="outlined" label={`Cập nhật ${preview.totalUpdate}`} />
      <Chip variant="outlined" label={`Bỏ qua ${preview.totalSkip}`} />
      <Chip
        variant="outlined"
        label={`Nguồn #${preview.sourceDepartmentId} -> Đích #${preview.targetDepartmentId}`}
      />
    </Stack>
  );
}

function ModuleTable({ module }: { module: DepartmentSyncModuleDiffModel }) {
  const items = module.items ?? [];

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: 860 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, width: 140 }}>Loại</TableCell>
            <TableCell sx={{ fontWeight: 600, width: 260 }}>Khóa</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Thay đổi chính</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length <= 0 ? (
            <TableRow>
              <TableCell colSpan={3}>
                <Typography variant="body2" color="text.secondary">
                  Không có thay đổi để review.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item, itemIndex) => (
              <TableRow key={`${module.key}-${item.key}-${itemIndex}`}>
                <TableCell>
                  <Chip
                    size="small"
                    color={CHANGE_TYPE_COLOR[item.changeType] ?? "default"}
                    label={CHANGE_TYPE_LABEL[item.changeType] ?? item.changeType}
                    variant={item.changeType === "skip" ? "outlined" : "filled"}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.key}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack spacing={0.75}>
                    {(item.fields ?? []).map((field, fieldIndex) => (
                      <Box key={`${item.key}-${field.label}-${fieldIndex}`}>
                        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
                          {field.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {field.before || "—"} {" ➡ "} {field.after || "—"}
                        </Typography>
                      </Box>
                    ))}
                    {(item.fields ?? []).length <= 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Không có chênh lệch field.
                      </Typography>
                    ) : null}
                  </Stack>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Box>
  );
}

export function DepartmentSyncReviewDialog({
  open,
  departmentId,
  departmentName,
  onClose,
  onApplied,
}: Props) {
  const [preview, setPreview] = React.useState<DepartmentSyncPreviewModel | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState(0);

  React.useEffect(() => {
    if (!open || !departmentId) {
      setPreview(null);
      setError(null);
      setActiveTab(0);
      return;
    }

    let alive = true;
    setLoading(true);
    setError(null);
    setPreview(null);

    void previewSyncFromParent(departmentId)
      .then((result) => {
        if (!alive) return;
        setPreview(result);
      })
      .catch((err) => {
        if (!alive) return;
        const message = err?.response?.data?.message || err?.message || "Không tải được preview sync";
        setError(message);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [open, departmentId]);

  const handleApply = async () => {
    if (!departmentId || !preview?.previewToken) return;
    setApplying(true);
    try {
      const result = await applySyncFromParent(departmentId, preview.previewToken);
      toast.success(
        `Sync "${departmentName ?? `Chi nhánh #${departmentId}`}" xong. Tạo ${result.totalCreate}, cập nhật ${result.totalUpdate}.`,
      );
      await onApplied?.(result);
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Sync thất bại";
      toast.error(message);
    } finally {
      setApplying(false);
    }
  };

  const content = loading ? (
    <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
      <CircularProgress size={28} />
      <Typography variant="body2" color="text.secondary">
        Đang phân tích diff Cha -&gt; Con...
      </Typography>
    </Stack>
  ) : error ? (
    <Alert severity="error">{error}</Alert>
  ) : preview ? (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Review thay đổi trước khi áp dụng cho chi nhánh con {departmentName ? `"${departmentName}"` : ""}.
      </Typography>
      <Summary preview={preview} />
      <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 2 }}
      >
        {preview.modules.map((module) => (
          <Tab key={module.key} label={`${module.label} (${module.create + module.update + module.skip})`} />
        ))}
      </Tabs>
      {preview.modules[activeTab] ? <ModuleTable module={preview.modules[activeTab]} /> : null}
    </>
  ) : (
    <Alert severity="info">Không có dữ liệu preview.</Alert>
  );

  return (
    <ConfirmDialog
      open={open}
      title="Kiểm tra dữ liệu trước khi Sync"
      content={content}
      confirmText="Sync"
      cancelText="Đóng"
      confirming={applying}
      width="xl"
      onClose={onClose}
      onConfirm={handleApply}
    />
  );
}
