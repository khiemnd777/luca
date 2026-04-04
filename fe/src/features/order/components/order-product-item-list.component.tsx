import * as React from "react";
import type { FormContext } from "@core/form/types";
import type { OrderItemProductModel } from "@features/order/model/order-item-product.model";
import { useAsyncDebounce } from "@core/hooks/use-async/use-async-debounce";
import { calculateTotalPrice } from "@features/order/api/order-item.api";

import { ListItemRender } from "@shared/components/list/list-item-render.component";
import { GenericItemList } from "@root/shared/components/list/list-item.component";

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

function normalizeItem(item: OrderItemProductModel) {
  return {
    productId: item.productId ?? null,
    productCode: item.productCode ?? "",
    quantity: Number(item.quantity) || 0,
    retailPrice: item.retailPrice == null ? null : Number(item.retailPrice) || 0,
    teethPosition: item.teethPosition,
    note: item.note ?? "",
  };
}

function buildSignature(vals: Record<string, any>) {
  return `${vals.productId ?? "null"}|${vals.productCode ?? ""}|${Number(vals.quantity) || 0}|${vals.retailPrice ?? "null"}|${vals.note ?? ""}`;
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
  const resolvedValues = values ?? ctx?.values ?? {};
  const ctxRef = React.useRef<FormContext | null>(ctx ?? null);
  const lastTotalRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    ctxRef.current = ctx ?? null;
  }, [ctx]);

  // ===== SINGLE SOURCE OF TRUTH =====
  const [items, setItems] = React.useState<OrderItemProductModel[]>(() => {
    if (Array.isArray(value)) return value;
    if (name && ctx && Array.isArray((ctx.values as any)?.[name])) {
      return (ctx.values as any)[name];
    }
    return [];
  });

  React.useEffect(() => {
    if (Array.isArray(value)) {
      setItems(value);
      return;
    }
    if (name && ctx && Array.isArray((ctx.values as any)?.[name])) {
      setItems((ctx.values as any)[name]);
    }
  }, [value, name, ctx, ctx?.values]);

  const propagate = React.useCallback(
    (next: OrderItemProductModel[]) => {
      setItems(next);

      if (onChange) {
        onChange(next);
      } else if (name && ctxRef.current) {
        ctxRef.current.setValue(name, next);
      }
    },
    [onChange, name]
  );

  // ===== CALCULATE TOTAL PRICE =====
  const { prices, quantities, signature } = React.useMemo(() => {
    const prices: number[] = [];
    const quantities: number[] = [];
    const productIds: (number | null)[] = [];

    for (const it of items) {
      productIds.push(it.productId ?? null);
      quantities.push(Number(it.quantity) || 0);
      prices.push(it.retailPrice == null ? 0 : Number(it.retailPrice) || 0);
    }

    return {
      prices,
      quantities,
      signature: `${productIds.join(",")}|${quantities.join(",")}|${prices.join(",")}`,
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
    const targetCtx = ctxRef.current;
    if (!targetCtx || calculatedTotalPrice == null) return;
    if (lastTotalRef.current === calculatedTotalPrice) return;

    lastTotalRef.current = calculatedTotalPrice;
    targetCtx.setValue("latestOrderItem.__totalProductPrice", calculatedTotalPrice);
  }, [calculatedTotalPrice]);

  return (
    <GenericItemList<OrderItemProductModel>
      value={items}
      addLabel={addLabel}
      emptyLabel="Chưa có sản phẩm nào."
      createItem={() => (createItem ?? defaultFactory)(resolvedValues)}
      onChange={propagate}
      onAdd={(item, list) => onAdd?.(item, list, ctx)}
      onRemove={(item, list) => onRemove?.(item, list, ctx)}
      renderItem={({ item, index, onChange, onRemove }) => {
        return (
          <ListItemRender<OrderItemProductModel>
            item={item}
            labelName="Sản phẩm"
            index={index}
            isEditable={true}
            allowEditToggle={!!item.isCloneable}
            isRemovable={!item.isCloneable}
            showItemLabel={false}
            actionsPlacement="aside"
            onChange={onChange}
            onRemove={onRemove}
            formName="order-product-item"
            normalize={normalizeItem}
            extractPatch={(vals) => normalizeItem(vals as any)}
            buildSignature={buildSignature}
            ctx={ctx}
            listKey="order-product"
          />
        );
      }}
    />
  );
}
