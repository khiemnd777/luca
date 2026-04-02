import * as React from "react";
import type { FormContext } from "@core/form/types";
import type { OrderItemMaterialModel } from "@features/order/model/order-item-material.model";
import { useAsyncDebounce } from "@core/hooks/use-async/use-async-debounce";
import { calculateTotalPrice } from "@features/order/api/order-item.api";

import { ListItemRender } from "@shared/components/list/list-item-render.component";
import { GenericItemList } from "@root/shared/components/list/list-item.component";

export type OrderMaterialItemListProps = {
  /** Controlled value from AutoForm (or any parent). */
  value?: OrderItemMaterialModel[] | null;

  /** Name inside FormContext to auto-sync when onChange is not provided. */
  name?: string;

  /** Access to AutoForm context */
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

function normalizeItem(item: OrderItemMaterialModel) {
  return {
    materialId: item.materialId ?? null,
    materialCode: item.materialCode ?? "",
    quantity: Number(item.quantity) || 0,
    retailPrice: item.retailPrice == null ? null : Number(item.retailPrice) || 0,
    note: item.note ?? "",    
  };
}

function buildSignature(vals: Record<string, any>) {
  return `${vals.materialId ?? "null"}|${vals.materialCode ?? ""}|${Number(vals.quantity) || 0}|${vals.retailPrice ?? "null"}|${vals.note ?? ""}`;
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
  const resolvedValues = values ?? ctx?.values ?? {};
  const ctxRef = React.useRef<FormContext | null>(ctx ?? null);
  const lastTotalRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    ctxRef.current = ctx ?? null;
  }, [ctx]);

  // ===== SINGLE SOURCE OF TRUTH =====
  const [items, setItems] = React.useState<OrderItemMaterialModel[]>(() => {
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
    (next: OrderItemMaterialModel[]) => {
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
    const materialIds: (number | null)[] = [];

    for (const it of items) {
      materialIds.push(it.materialId ?? null);
      quantities.push(Number(it.quantity) || 0);
      prices.push(it.retailPrice == null ? 0 : Number(it.retailPrice) || 0);
    }

    return {
      prices,
      quantities,
      signature: `${materialIds.join(",")}|${quantities.join(",")}|${prices.join(",")}`,
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
    targetCtx.setValue("latestOrderItem.__totalConsumableMaterialPrice", calculatedTotalPrice);
  }, [calculatedTotalPrice]);

  return (
    <GenericItemList<OrderItemMaterialModel>
      value={items}
      addLabel={addLabel}
      emptyLabel="Không có vật tư tiêu hao nào."
      createItem={() => (createItem ?? defaultFactory)(resolvedValues)}
      onChange={propagate}
      onAdd={(item, list) => onAdd?.(item, list, ctx)}
      onRemove={(item, list) => onRemove?.(item, list, ctx)}
      renderItem={({ item, index, onChange, onRemove }) => (
        <ListItemRender<OrderItemMaterialModel>
          item={item}
          labelName="Vật tư"
          index={index}
          onChange={onChange}
          onRemove={onRemove}
          isEditable={true}
          allowEditToggle={!!item.isCloneable}
          isRemovable={!item.isCloneable}
          formName="order-consumable-material-item"
          normalize={normalizeItem}
          extractPatch={(vals) => normalizeItem(vals as any)}
          buildSignature={buildSignature}
          ctx={ctx}
          listKey="order-consumable-material"
        />
      )}
    />
  );
}
