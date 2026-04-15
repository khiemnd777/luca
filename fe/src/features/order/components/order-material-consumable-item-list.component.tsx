import * as React from "react";
import { useAsyncDebounce } from "@core/hooks/use-async/use-async-debounce";
import type { FormContext } from "@core/form/types";
import { calculateTotalPrice } from "@features/order/api/order-item.api";
import type { OrderItemMaterialModel } from "@features/order/model/order-item-material.model";
import { Typography } from "@mui/material";
import { prefixCurrency } from "@root/shared/utils/currency.utils";
import { OrderItemTableEditor } from "./order-item-table-editor.component";

export type OrderMaterialItemListProps = {
  value?: OrderItemMaterialModel[] | null;
  name?: string;
  ctx?: FormContext | null;
  values?: Record<string, any>;
  onChange?: (items: OrderItemMaterialModel[]) => void;
  onAdd?: (
    item: OrderItemMaterialModel,
    items: OrderItemMaterialModel[],
    ctx?: FormContext | null
  ) => void;
  onRemove?: (
    item: OrderItemMaterialModel,
    items: OrderItemMaterialModel[],
    ctx?: FormContext | null
  ) => void;
  createItem?: (values: Record<string, any>) => OrderItemMaterialModel;
  addLabel?: string;
};

function defaultFactory(values: Record<string, any>): OrderItemMaterialModel {
  return {
    id: Date.now(),
    materialCode: "",
    materialId: null,
    orderItemId: values.orderItemId ?? values.id ?? null,
    orderId: values.orderId ?? null,
    quantity: 1,
    retailPrice: 0,
  };
}

function toNumber(value?: number | null) {
  return value == null ? 0 : Number(value) || 0;
}

function formatCurrency(value?: number | null) {
  return `${prefixCurrency} ${toNumber(value).toLocaleString("vi-VN")}`;
}

function getMaterialLabel(item: OrderItemMaterialModel) {
  const code = item.materialCode?.trim();
  const name = item.materialName?.trim();
  if (code && name) return `${code} → ${name}`;
  if (code) return code;
  if (name) return name;
  return item.materialId != null ? `Vật tư #${item.materialId}` : `Vật tư #${item.id}`;
}

function normalizeItem(item: OrderItemMaterialModel) {
  return {
    materialId: item.materialId ?? null,
    materialCode: item.materialCode ?? "",
    quantity: Number(item.quantity) || 0,
    retailPrice: item.retailPrice == null ? null : Number(item.retailPrice) || 0,
    note: item.note ?? "",
  };
}

export function OrderConsumableMaterialItemList({
  value,
  name,
  ctx,
  values,
  onChange,
  onAdd,
  onRemove,
  createItem,
  addLabel = "Thêm vật tư tiêu hao",
}: OrderMaterialItemListProps) {
  const items = React.useMemo(() => {
    if (Array.isArray(value)) return value;
    if (name && ctx && Array.isArray((ctx.values as any)?.[name])) {
      return (ctx.values as any)[name] as OrderItemMaterialModel[];
    }
    return [];
  }, [value, name, ctx, ctx?.values]);
  const lastTotalRef = React.useRef<number | null>(null);

  const { prices, quantities, signature } = React.useMemo(() => {
    const nextPrices: number[] = [];
    const nextQuantities: number[] = [];
    const materialIds: (number | null)[] = [];

    for (const item of items) {
      materialIds.push(item.materialId ?? null);
      nextQuantities.push(toNumber(item.quantity));
      nextPrices.push(toNumber(item.retailPrice));
    }

    return {
      prices: nextPrices,
      quantities: nextQuantities,
      signature: `${materialIds.join(",")}|${nextQuantities.join(",")}|${nextPrices.join(",")}`,
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
    ctx.setValue("latestOrderItem.__totalConsumableMaterialPrice", calculatedTotalPrice);
  }, [calculatedTotalPrice, ctx]);

  return (
    <OrderItemTableEditor<OrderItemMaterialModel>
      value={value}
      name={name}
      ctx={ctx}
      values={values}
      onChange={onChange}
      onAdd={onAdd}
      onRemove={onRemove}
      createItem={(currentValues) => (createItem ?? defaultFactory)(currentValues)}
      formName="order-consumable-material-item"
      addLabel={addLabel}
      emptyLabel="Không có vật tư tiêu hao nào."
      dialogTitle="vật tư tiêu hao"
      buildItem={(draft, submittedValues) => ({
        ...draft,
        ...normalizeItem(submittedValues as OrderItemMaterialModel),
      })}
      canEditItem={() => true}
      canRemoveItem={(item) => !item.isCloneable}
      getDeleteMessage={(item) => `Bạn có chắc muốn xóa ${getMaterialLabel(item)}?`}
      footerCells={{
        name: "Tổng",
        retailPrice: formatCurrency(calculatedTotalPrice ?? 0),
      }}
      columns={[
        {
          key: "name",
          header: "Tên vật tư",
          render: (item) => getMaterialLabel(item),
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
