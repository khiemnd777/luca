import * as React from "react";
import { useAsyncDebounce } from "@core/hooks/use-async/use-async-debounce";
import type { FormContext } from "@core/form/types";
import { calculateTotalPrice } from "@features/order/api/order-item.api";
import type { OrderItemProductModel } from "@features/order/model/order-item-product.model";
import { lowerToothCodes, upperToothCodes } from "@features/order/components/teeth/teeth-chart";
import { TOOTH_SPRITES } from "@features/order/components/teeth/tooth-sprite-map";
import { prefixCurrency } from "@root/shared/utils/currency.utils";
import { Stack, Typography } from "@mui/material";
import { OrderItemTableEditor } from "./order-item-table-editor.component";

export type OrderProductItemListProps = {
  value?: OrderItemProductModel[] | null;
  name?: string;
  ctx?: FormContext | null;
  values?: Record<string, any>;
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
  createItem?: (values: Record<string, any>) => OrderItemProductModel;
  addLabel?: string;
};

function defaultFactory(values: Record<string, any>): OrderItemProductModel {
  return {
    id: Date.now(),
    productCode: "",
    productId: null,
    orderItemId: values.orderItemId ?? values.id ?? null,
    orderId: values.orderId ?? null,
    quantity: 1,
    retailPrice: 0,
    note: null,
    teethPosition: null,
  };
}

function toNumber(value?: number | null) {
  return value == null ? 0 : Number(value) || 0;
}

function formatCurrency(value?: number | null) {
  return `${prefixCurrency} ${toNumber(value).toLocaleString("vi-VN")}`;
}

function getProductLabel(item: OrderItemProductModel) {
  const name = item.productName?.trim();
  if (name) return name;
  const code = item.productCode?.trim();
  if (code) return code;
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

const validToothCodes = new Set<number>(
  Object.keys(TOOTH_SPRITES).map((code) => Number(code))
);

function parseToothPositions(value?: string | null): number[] {
  if (!value) return [];
  const result = new Set<number>();

  value.split(",").forEach((rawToken) => {
    const token = rawToken.trim();
    if (!token) return;

    const [startStr, endStr, extra] = token.split("-").map((part) => part.trim());
    if (extra) return;

    const start = Number(startStr);
    const end = endStr ? Number(endStr) : start;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;

    const rangeStart = Math.min(start, end);
    const rangeEnd = Math.max(start, end);

    for (let code = rangeStart; code <= rangeEnd; code += 1) {
      if (validToothCodes.has(code)) {
        result.add(code);
      }
    }
  });

  return Array.from(result).sort((a, b) => a - b);
}

function formatToothRanges(nums: number[]) {
  if (!nums.length) return "";

  const ranges: string[] = [];
  let start = nums[0];
  let prev = nums[0];

  for (let i = 1; i < nums.length; i += 1) {
    const current = nums[i];
    if (current === prev + 1) {
      prev = current;
      continue;
    }

    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = current;
    prev = current;
  }

  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
  return ranges.join(",");
}

function formatTeethByJaw(value?: string | null) {
  const positions = parseToothPositions(value);
  const upperSet = new Set<number>(upperToothCodes);
  const lowerSet = new Set<number>(lowerToothCodes);

  return {
    upper: formatToothRanges(positions.filter((code) => upperSet.has(code))),
    lower: formatToothRanges(positions.filter((code) => lowerSet.has(code))),
  };
}

function renderTeethPosition(value?: string | null) {
  const byJaw = formatTeethByJaw(value);
  if (!byJaw.upper && !byJaw.lower) return "—";

  return (
    <Stack spacing={0.25}>
      {byJaw.upper && <Typography variant="body2">HT: {byJaw.upper}</Typography>}
      {byJaw.lower && <Typography variant="body2">HD: {byJaw.lower}</Typography>}
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
  const items = React.useMemo(() => {
    if (Array.isArray(value)) return value;
    if (name && ctx && Array.isArray((ctx.values as any)?.[name])) {
      return (ctx.values as any)[name] as OrderItemProductModel[];
    }
    return [];
  }, [value, name, ctx, ctx?.values]);
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
