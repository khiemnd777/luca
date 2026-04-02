import { Stack, Typography } from "@mui/material";
import { packageData } from "@root/core/form/auto-form-package";
import type { FormContext } from "@root/core/form/types";
import { mapper } from "@root/core/mapper/auto-mapper";
import { validatePromotion, type PromotionValidateResult } from "@root/features/promotion/api/promotion.api";
import { SafeButton } from "@root/shared/components/button/safe-button";
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import React from "react";
import { prefixCurrency } from "@root/shared/utils/currency.utils";
import { getPromotionErrorMessage } from "@root/features/promotion/model/promotion-reason.const";

type PromotionValidateButtonProps = {
  values: Record<string, any>;
  ctx?: FormContext | null;
};

export default function PromotionValidateButton({ values, ctx }: PromotionValidateButtonProps) {
  const promoCode = String(values.promotionCode ?? "").trim();
  const [result, setResult] = React.useState<PromotionValidateResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setResult(null);
    setError(null);
  }, [promoCode]);

  const handleValidate = async () => {
    if (!promoCode) {
      setError("Vui lòng nhập mã khuyến mãi");
      setResult(null);
      return;
    }

    setError(null);
    try {
      const theOrder = packageData(ctx?.metadataBlocks ?? [], values);
      const orderDto = {
        ...theOrder.dto,
        latest_order_item: {
          ...mapper.map<any, any>("Common", theOrder.dto.latest_order_item_upsert.dto, "model_to_dto"),
        }
      }
      console.log(orderDto);
      const validated = await validatePromotion({
        promoCode,
        order: orderDto,
      });
      setResult(validated);
    } catch {
      setResult(null);
      setError("Không thể kiểm tra mã khuyến mãi");
    }
  };

  const statusText = result
    ? result.valid
      ? "Mã hợp lệ"
      : "Mã không hợp lệ"
    : "";

  return (
    <Stack spacing={1}>
      <SafeButton
        variant="contained"
        color="info"
        icon={<PriceChangeIcon />}
        requireDirty={false}
        requireValid={false}
        disabled={!promoCode}
        onClick={handleValidate}
      >
        Kiểm tra mã khuyến mãi
      </SafeButton>
      {error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : null}
      {result ? (
        <Stack spacing={0.5}>
          <Typography
            variant="body2"
            color={result.valid ? "success.main" : "error.main"}
          >
            {statusText}
          </Typography>
          {result.reason ? (
            <Typography variant="caption" color="text.secondary">
              {getPromotionErrorMessage(result.reason)}
            </Typography>
          ) : null}
          {Number.isFinite(result.discountAmount) ? (
            <Typography variant="caption">
              Giảm giá: {prefixCurrency} {Number(result.discountAmount).toLocaleString()}
            </Typography>
          ) : null}
          {Number.isFinite(result.finalPrice) ? (
            <Typography variant="caption">
              Giá sau giảm: {prefixCurrency} {Number(result.finalPrice).toLocaleString()}
            </Typography>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}
