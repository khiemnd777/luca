import { AutoForm } from "@core/form/auto-form";
import { useAsync } from "@root/core/hooks/use-async";
import { InformationDialog } from "@root/shared/components/dialog/infomation-dialog";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { getInProgressesByProcessId } from "../api/order-item-process.api";
import type { OrderItemProcessInProgressProcessModel } from "../model/order-item-process-inprogress-process.model";

type OrderProcessInProgressProps = {
  open: boolean;
  processId?: number | null;
  onClose: () => void;
};

export function OrderProcessInProgressDialog({
  open,
  processId,
  onClose,
}: OrderProcessInProgressProps) {
  const { data: inprogresses, loading } = useAsync<OrderItemProcessInProgressProcessModel[]>(
    () => {
      if (!open || !processId) return Promise.resolve([]);
      return getInProgressesByProcessId(processId);
    },
    [open, processId],
    {
      key: `order-process-inprogress:${processId ?? ""}`,
    }
  );

  const content = loading ? (
    <Stack alignItems="center" py={2}>
      <CircularProgress size={22} />
    </Stack>
  ) : (
    <Stack spacing={2}>
      {(inprogresses ?? []).map((item, idx) => (
        <Box
          key={item.id ?? idx}
          pb={2}
          sx={{
            borderBottom: idx === (inprogresses ?? []).length - 1 ? "none" : "1px dashed",
            borderColor: "divider",
          }}
        >
          <AutoForm name="order-process-inprogress-prev" initial={item ?? {}} />
        </Box>
      ))}

      {(inprogresses ?? []).length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Không có dữ liệu
        </Typography>
      )}
    </Stack>
  );

  return (
    <InformationDialog
      open={open}
      title="Lịch sử công đoạn"
      content={content}
      closeText="Đóng"
      onClose={onClose}
    />
  );
}
