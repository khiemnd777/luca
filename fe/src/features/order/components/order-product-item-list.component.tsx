import * as React from "react";
import { useAsyncDebounce } from "@core/hooks/use-async/use-async-debounce";
import type { FormContext } from "@core/form/types";
import { calculateTotalPrice } from "@features/order/api/order-item.api";
import type { OrderItemProductModel } from "@features/order/model/order-item-product.model";
import { formatToothPositionsByJaw } from "@features/order/utils/tooth-position.utils";
import { prefixCurrency } from "@root/shared/utils/currency.utils";
import { formatCodeNameLabel } from "@shared/utils/code-name-label.utils";
import { Stack, Typography } from "@mui/material";
import { OrderItemTableEditor } from "./order-item-table-editor.component";

export type OrderProductItemListProps = {
  value?: OrderItemProductModel[] | null;
  name?: string;
  ctx?: FormContext | null;
  values?: Record<string, unknown>;
  onChange?: (items: OrderItemProductModel[]) => void;
  onAdd?: (
    item: OrderItemProductModel,
    items: OrderItemProductModel[],
    ctx?: FormContext | null
  ) => void;
  onRemove?: (
    item: OrderItemProductModel,
    items: OrderItemProductModel[],
    ctx?: FormContext | null
  ) => void;
  createItem?: (values: Record<string, unknown>) => OrderItemProductModel;
  addLabel?: string;
};

function defaultFactory(values: Record<string, unknown>): OrderItemProductModel {
  return {
    id: Date.now(),
    productCode: "",
    productId: null,
    orderItemId: toOptionalNumber(values.orderItemId ?? values.id),
    orderId: toOptionalNumber(values.orderId),
    quantity: 1,
    retailPrice: 0,
    note: null,
    teethPosition: null,
  };
}

function toNumber(value?: number | null) {
  return value == null ? 0 : Number(value) || 0;
}

function toOptionalNumber(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function formatCurrency(value?: number | null) {
  return `${prefixCurrency} ${toNumber(value).toLocaleString("vi-VN")}`;
}

function getProductLabel(item: OrderItemProductModel) {
  const label = formatCodeNameLabel({
    code: item.productCode,
    name: item.productName,
  });
  if (label) return label;
  return `Sản phẩm #${item.productId ?? item.id}`;
}

function normalizeItem(item: OrderItemProductModel) {
  return {
    productId: item.productId ?? null,
    productCode: item.productCode ?? "",
    productName: item.productName ?? "",
    quantity: Number(item.quantity) || 0,
    retailPrice: item.retailPrice == null ? null : Number(item.retailPrice) || 0,
    teethPosition: item.teethPosition ?? null,
    note: item.note ?? "",
  };
}

function renderTeethPosition(value?: string | null) {
  const byJaw = formatToothPositionsByJaw(value);
  if (!byJaw.upper && !byJaw.lower) return "—";

  return (
    <Stack spacing={0.25}>
      {byJaw.upper && <Typography variant="body2">Răng trên: {byJaw.upper}</Typography>}
      {byJaw.lower && <Typography variant="body2">Răng dưới: {byJaw.lower}</Typography>}
    </Stack>
  );
}

export function OrderProductItemList({
  value,
  name,
  ctx,
  values,
  onChange,
  onAdd,
  onRemove,
  createItem,
  addLabel = "Thêm sản phẩm",
}: OrderProductItemListProps) {
  const ctxValues = ctx?.values;
  const items = React.useMemo(() => {
    if (Array.isArray(value)) return value;
    if (name && ctxValues && Array.isArray(ctxValues[name])) {
      return ctxValues[name] as OrderItemProductModel[];
    }
    return [];
  }, [value, name, ctxValues]);
  const lastTotalRef = React.useRef<number | null>(null);

  const { prices, quantities, signature } = React.useMemo(() => {
    const nextPrices: number[] = [];
    const nextQuantities: number[] = [];
    const productIds: (number | null)[] = [];

    for (const item of items) {
      productIds.push(item.productId ?? null);
      nextQuantities.push(toNumber(item.quantity));
      nextPrices.push(toNumber(item.retailPrice));
    }

    return {
      prices: nextPrices,
      quantities: nextQuantities,
      signature: `${productIds.join(",")}|${nextQuantities.join(",")}|${nextPrices.join(",")}`,
    };
  }, [items]);

  const { data: calculatedTotalPrice } = useAsyncDebounce(
    () => {
      if (prices.length === 0) return Promise.resolve(0);
      return calculateTotalPrice({ prices, quantities });
    },
    250,
    [signature]
  );

  React.useEffect(() => {
    if (!ctx || calculatedTotalPrice == null) return;
    if (lastTotalRef.current === calculatedTotalPrice) return;
    lastTotalRef.current = calculatedTotalPrice;
    ctx.setValue("latestOrderItem.__totalProductPrice", calculatedTotalPrice);
  }, [calculatedTotalPrice, ctx]);

  return (
    <OrderItemTableEditor<OrderItemProductModel>
      value={value}
      name={name}
      ctx={ctx}
      values={values}
      onChange={onChange}
      onAdd={onAdd}
      onRemove={onRemove}
      createItem={(currentValues) => (createItem ?? defaultFactory)(currentValues)}
      formName="order-product-item"
      addLabel={addLabel}
      emptyLabel="Chưa có sản phẩm nào."
      dialogTitle="sản phẩm"
      buildItem={(draft, submittedValues) => ({
        ...draft,
        ...normalizeItem(submittedValues as OrderItemProductModel),
      })}
      canEditItem={() => true}
      canRemoveItem={(item) => !item.isCloneable}
      getDeleteMessage={(item) => `Bạn có chắc muốn xóa ${getProductLabel(item)}?`}
      footerCells={{
        name: "Tổng",
        retailPrice: formatCurrency(calculatedTotalPrice ?? 0),
      }}
      columns={[
        {
          key: "name",
          header: "Tên sản phẩm",
          render: (item) => getProductLabel(item),
        },
        {
          key: "quantity",
          header: "Số lượng",
          width: 110,
          align: "right",
          render: (item) => toNumber(item.quantity).toLocaleString("vi-VN"),
        },
        {
          key: "retailPrice",
          header: "Giá bán lẻ",
          width: 150,
          align: "right",
          render: (item) => formatCurrency(item.retailPrice),
        },
        {
          key: "teethPosition",
          header: "Vị trí răng",
          width: 160,
          render: (item) => renderTeethPosition(item.teethPosition),
        },
        {
          key: "note",
          header: "Ghi chú",
          render: (item) => (
            <Typography variant="body2" color={item.note ? "text.primary" : "text.secondary"}>
              {item.note || "—"}
            </Typography>
          ),
        },
      ]}
    />
  );
}
