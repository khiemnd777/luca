import { useParams } from "react-router-dom";
import { CircularProgress, Stack, Typography } from "@mui/material";
import { useAsync } from "@root/core/hooks/use-async";
import { syncPrice } from "../api/order.api";
import { prefixCurrency } from "@root/shared/utils/currency.utils";

type OrderTotalPriceProps = {
  orderId?: number | null;
  label?: string;
};

const numberFormatter = new Intl.NumberFormat("vi-VN");

function formatCurrency(value: number) {
  return numberFormatter.format(value);
}

export default function OrderTotalPrice({
  orderId,
  label = "Thành tiền",
}: OrderTotalPriceProps) {
  const { orderId: orderIdParam } = useParams();
  const resolvedOrderId = orderId ?? (orderIdParam ? Number(orderIdParam) : null);

  const { data: totalPrice, loading } = useAsync<number | null>(
    async () => {
      if (!resolvedOrderId) return null;
      return syncPrice(resolvedOrderId);
    },
    [resolvedOrderId],
    {
      key: `order-total-price:${resolvedOrderId ?? ""}`,
    }
  );

  if (loading) {
    return (
      <Stack alignItems="center" py={1}>
        <CircularProgress size={20} />
      </Stack>
    );
  }

  if (totalPrice == null) {
    return (
      <Typography variant="body2" color="text.secondary">
        {label}: —
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="baseline">
      <Typography variant="body2" color="text.secondary">
        {label}:
      </Typography>
      <Typography variant="h6" fontWeight={700}>
        {prefixCurrency} {formatCurrency(totalPrice)}
      </Typography>
    </Stack>
  );
}
