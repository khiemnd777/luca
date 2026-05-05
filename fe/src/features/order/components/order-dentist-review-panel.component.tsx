import React from "react";
import {
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";

import { useAsync } from "@root/core/hooks/use-async";
import { useAuthStore } from "@store/auth-store";
import { SectionCard } from "@shared/components/ui/section-card";
import { SafeButton } from "@shared/components/button/safe-button";
import { dentistReviews, resolveDentistReview } from "../api/order-item-process.api";
import type {
  OrderItemProcessDentistReviewModel,
  OrderItemProcessDentistReviewResult,
} from "../model/order-item-process-inprogress.model";
import { buildProductNameLabel } from "../utils/order.utils";
import { formatDateTime } from "@root/shared/utils/datetime.utils";

type OrderDentistReviewPanelProps = {
  orderId?: number | null;
  orderItemId?: number | null;
  onResolved?: () => void;
};

export function OrderDentistReviewPanel({
  orderId,
  orderItemId,
  onResolved,
}: OrderDentistReviewPanelProps) {
  const canResolve = useAuthStore((state) => state.hasPermission("order.development"));
  const [refreshVersion, setRefreshVersion] = React.useState(0);

  const { data: reviews, loading } = useAsync<OrderItemProcessDentistReviewModel[]>(
    () => {
      if (!canResolve || !orderId || !orderItemId) return Promise.resolve([]);
      return dentistReviews(orderId, orderItemId, "pending");
    },
    [canResolve, orderId, orderItemId, refreshVersion],
    {
      key: `order-detail-dentist-reviews:${orderId ?? ""}:${orderItemId ?? ""}:${refreshVersion}`,
    },
  );

  const handleResolved = React.useCallback(async () => {
    setRefreshVersion((value) => value + 1);
    onResolved?.();
  }, [onResolved]);

  if (!canResolve || !orderId || !orderItemId) {
    return null;
  }

  if (loading) {
    return (
      <SectionCard title="Yêu cầu nha sĩ check">
        <Stack alignItems="center" py={2}>
          <CircularProgress size={22} />
        </Stack>
      </SectionCard>
    );
  }

  if (!reviews?.length) {
    return null;
  }

  return (
    <SectionCard title="Yêu cầu nha sĩ check">
      <Stack spacing={2}>
        <Alert severity="warning" variant="outlined">
          Case đang chờ Admin ghi nhận kết quả nha sĩ check trước khi tiếp tục gia công.
        </Alert>

        {reviews.map((review, index) => (
          <React.Fragment key={review.id ?? index}>
            {index > 0 ? <Divider /> : null}
            <DentistReviewAdminCard review={review} onResolved={handleResolved} />
          </React.Fragment>
        ))}
      </Stack>
    </SectionCard>
  );
}

function DentistReviewAdminCard({
  review,
  onResolved,
}: {
  review: OrderItemProcessDentistReviewModel;
  onResolved: () => Promise<void>;
}) {
  const [result, setResult] = React.useState<OrderItemProcessDentistReviewResult>("approved");
  const [note, setNote] = React.useState("");

  const handleResolve = React.useCallback(async () => {
    if (!review.id) {
      toast.error("Không tìm thấy mã yêu cầu nha sĩ check");
      return;
    }

    try {
      await resolveDentistReview(review.id, {
        result,
        note,
      });
      toast.success("Ghi nhận kết quả thành công");
      await onResolved();
    } catch (err) {
      toast.error("Ghi nhận kết quả thất bại");
      throw err;
    }
  }, [note, onResolved, result, review.id]);

  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <ReviewInfoRow label="Sản phẩm" value={buildProductNameLabel(review) || "—"} />
        <ReviewInfoRow label="Công đoạn" value={review.processName || "—"} />
        <ReviewInfoRow label="Nội dung cần nha sĩ check" value={review.requestNote || "—"} preserveLineBreaks />
        {review.requestedBy ? (
          <ReviewInfoRow label="Người tạo yêu cầu" value={`User #${review.requestedBy}`} />
        ) : null}
        <ReviewInfoRow label="Thời điểm tạo yêu cầu" value={formatDateTime(review.requestedAt)} />
      </Stack>

      <FormControl>
        <FormLabel>Kết quả</FormLabel>
        <RadioGroup
          row
          value={result}
          onChange={(event) => setResult(event.target.value as OrderItemProcessDentistReviewResult)}
        >
          <FormControlLabel value="approved" control={<Radio size="small" />} label="Duyệt" />
          <FormControlLabel value="rejected" control={<Radio size="small" />} label="Từ chối, yêu cầu làm lại" />
        </RadioGroup>
      </FormControl>

      <TextField
        fullWidth
        multiline
        minRows={3}
        size="small"
        label="Ghi chú kết quả"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />

      <Stack direction="row" justifyContent="flex-end">
        <SafeButton variant="contained" onClick={handleResolve}>
          Ghi nhận kết quả
        </SafeButton>
      </Stack>
    </Stack>
  );
}

function ReviewInfoRow({
  label,
  value,
  preserveLineBreaks,
}: {
  label: string;
  value?: string | null;
  preserveLineBreaks?: boolean;
}) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: preserveLineBreaks ? "pre-wrap" : undefined }}>
        {value || "—"}
      </Typography>
    </Stack>
  );
}
