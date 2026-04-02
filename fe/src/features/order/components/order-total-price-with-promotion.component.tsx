import { CircularProgress, Stack, Typography } from "@mui/material";
import type { FormContext } from "@root/core/form/types";
import { mapper } from "@root/core/mapper/auto-mapper";
import { useAsync } from "@root/core/hooks/use-async";
import { packageData } from "@root/core/form/auto-form-package";
import { calculateTotalPrice } from "@root/features/promotion/api/promotion.api";
import { prefixCurrency } from "@root/shared/utils/currency.utils";

type TotalPriceWithPromotionProps = {
  values: Record<string, unknown>;
  formCtx?: FormContext | null;
};

function buildOrderDto(values: Record<string, unknown>, formCtx?: FormContext | null) {
  const packaged = packageData(formCtx?.metadataBlocks ?? [], values) as { dto?: Record<string, unknown> };
  const dto = packaged.dto ?? {};
  const latestOrderItemUpsert = dto["latest_order_item_upsert"] as { dto?: unknown } | undefined;
  return {
    ...dto,
    latest_order_item: mapper.map("Common", latestOrderItemUpsert?.dto ?? {}, "model_to_dto"),
  };
}

export default function TotalPriceWithPromotion({ values, formCtx }: TotalPriceWithPromotionProps) {
  const promoCode = String(values.promotionCode ?? "").trim();
  const consumableMaterialPrice = values["latestOrderItem.__totalConsumableMaterialPrice"] as number;
  const productPrice = values["latestOrderItem.__totalProductPrice"] as number;
  const hasLocalTotal = Number.isFinite(consumableMaterialPrice) && Number.isFinite(productPrice);
  const localTotal = hasLocalTotal ? Number(consumableMaterialPrice) + Number(productPrice) : null;

  const { data: finalPrice, loading } = useAsync<number | null>(
    async () => {
      if (!hasLocalTotal) {
        return null;
      }
      if (!promoCode) {
        return localTotal;
      }

      const orderDto = buildOrderDto(values, formCtx);

      const calculated = await calculateTotalPrice({
        promoCode,
        order: orderDto,
      });

      return Number.isFinite(calculated.finalPrice) ? Number(calculated.finalPrice) : localTotal;
    },
    [
      promoCode,
      hasLocalTotal,
      localTotal,
      values["latestOrderItem.products"],
      values["latestOrderItem.consumableMaterials"],
    ],
    {
      key: `edit-order-total-price:${String(values.id ?? "")}:${promoCode}:${localTotal ?? ""}`,
    }
  );

  if (!hasLocalTotal) {
    return <Typography>Thành tiền = Sản phẩm - Khuyến mãi: —</Typography>;
  }

  if (loading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography>Thành tiền = Sản phẩm - Khuyến mãi:</Typography>
        <CircularProgress size={16} />
      </Stack>
    );
  }

  return (
    <Typography>
      Thành tiền = Sản phẩm - Khuyến mãi: {prefixCurrency} {Number(finalPrice ?? localTotal).toLocaleString()}
    </Typography>
  );
}

export function TotalPriceWithPromotionV2({ values, formCtx }: TotalPriceWithPromotionProps) {
  const promoCode = String(values.promotionCode ?? "").trim();
  const orderDto = buildOrderDto(values, formCtx);
  const { data: pricing, loading } = useAsync<{ finalPrice: number | null; discountAmount: number | null }>(
    async () => {
      const calculated = await calculateTotalPrice({
        promoCode,
        order: orderDto,
      });
      return {
        finalPrice: Number.isFinite(calculated.finalPrice) ? Number(calculated.finalPrice) : null,
        discountAmount: Number.isFinite(calculated.discountAmount) ? Number(calculated.discountAmount) : null,
      };
    },
    [promoCode, values["latestOrderItem.products"], values["latestOrderItem.consumableMaterials"]],
    {
      key: `edit-order-total-price:${String(values.id ?? "")}:${promoCode}`,
    }
  );

  if (loading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography>Thành tiền = Sản phẩm - Khuyến mãi:</Typography>
        <CircularProgress size={16} />
      </Stack>
    );
  }

  const finalPrice = pricing?.finalPrice ?? null;
  const discountAmount = pricing?.discountAmount ?? 0;
  const productPrice = Number.isFinite(finalPrice) ? Number(finalPrice) + Number(discountAmount) : null;

  if (!Number.isFinite(finalPrice) || !Number.isFinite(productPrice)) {
    return <Typography>Thành tiền = Sản phẩm - Khuyến mãi: —</Typography>;
  }

  return (
    <Stack spacing={0.5}>
      <Typography>
        Thành tiền = Sản phẩm - Khuyến mãi: {prefixCurrency} {Number(finalPrice).toLocaleString()}
      </Typography>
      <Typography>
        Sản phẩm: {prefixCurrency} {Number(productPrice).toLocaleString()}
      </Typography>
      <Typography>
        Khuyến mãi: {prefixCurrency} {Number(discountAmount).toLocaleString()}
      </Typography>
    </Stack>
  );
}
