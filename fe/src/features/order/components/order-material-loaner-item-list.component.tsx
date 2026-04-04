import * as React from "react";
import type { FormContext } from "@core/form/types";
import type { OrderItemMaterialModel } from "@features/order/model/order-item-material.model";

import { ListItemRender } from "@shared/components/list/list-item-render.component";
import { GenericItemList } from "@root/shared/components/list/list-item.component";

export type OrderMaterialItemListProps = {
  /** Controlled value from AutoForm (or any parent). */
  value?: OrderItemMaterialModel[] | null;

  /** Name inside FormContext to auto-sync when onChange is not provided. */
  name?: string;
  frmName?: string;

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
    status: "on_loan",
  };
}

function normalizeItem(item: OrderItemMaterialModel) {
  return {
    materialId: item.materialId ?? null,
    materialCode: item.materialCode ?? "",
    quantity: Number(item.quantity) || 0,
    retailPrice: item.retailPrice == null ? null : Number(item.retailPrice) || 0,
    note: item.note ?? "",
    status: item.status,
  };
}

function buildSignature(vals: Record<string, any>) {
  return `${vals.materialId ?? "null"}|${vals.materialCode ?? ""}|${Number(vals.quantity) || 0}|${vals.retailPrice ?? "null"}|${vals.status ?? ""}|${vals.note ?? ""}`;
}

export function OrderLoanerMaterialItemList({
  value,
  name,
  frmName,
  ctx,
  values,
  onChange,
  onAdd,
  onRemove,
  createItem,
  addLabel = "Thêm vật tư cho mượn",
}: OrderMaterialItemListProps) {
  const resolvedValues = values ?? ctx?.values ?? {};
  const ctxRef = React.useRef<FormContext | null>(ctx ?? null);

  React.useEffect(() => {
    ctxRef.current = ctx ?? null;
  }, [ctx]);

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

  return (
    <GenericItemList<OrderItemMaterialModel>
      value={items}
      addLabel={addLabel}
      emptyLabel="Không có vật tư cho mượn nào."
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
          showItemLabel={false}
          actionsPlacement="aside"
          formName={frmName ?? "order-loaner-material-item"}
          normalize={normalizeItem}
          extractPatch={(vals) => normalizeItem(vals as any)}
          buildSignature={buildSignature}
          ctx={ctx}
          listKey="order-loaner-material"
        />
      )}
    />
  );
}
