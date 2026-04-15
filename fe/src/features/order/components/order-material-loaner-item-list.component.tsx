import type { FormContext } from "@core/form/types";
import type { OrderItemMaterialModel } from "@features/order/model/order-item-material.model";
import { Typography } from "@mui/material";
import { OrderItemTableEditor } from "./order-item-table-editor.component";

export type OrderMaterialItemListProps = {
  value?: OrderItemMaterialModel[] | null;
  name?: string;
  frmName?: string;
  variant?: "loaner" | "implant";
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

function getMaterialLabel(item: OrderItemMaterialModel) {
  const code = item.materialCode?.trim();
  const name = item.materialName?.trim();
  if (code && name) return `${code} → ${name}`;
  if (code) return code;
  if (name) return name;
  return item.materialId != null ? `Vật tư #${item.materialId}` : `Vật tư #${item.id}`;
}

function normalizeItem(item: OrderItemMaterialModel, keepStatus: boolean) {
  return {
    materialId: item.materialId ?? null,
    materialCode: item.materialCode ?? "",
    quantity: Number(item.quantity) || 0,
    retailPrice: item.retailPrice == null ? null : Number(item.retailPrice) || 0,
    note: item.note ?? "",
    ...(keepStatus ? { status: item.status ?? null } : {}),
  };
}

export function OrderLoanerMaterialItemList({
  value,
  name,
  frmName,
  variant = "loaner",
  ctx,
  values,
  onChange,
  onAdd,
  onRemove,
  createItem,
  addLabel,
}: OrderMaterialItemListProps) {
  const resolvedFormName = frmName ?? "order-loaner-material-item";
  const isImplantVariant = variant === "implant";
  const showStatus = resolvedFormName.endsWith("-with-status-item");
  const itemLabel = isImplantVariant ? "phụ kiện implant" : "vật tư cho mượn";
  const resolvedAddLabel = addLabel ?? (isImplantVariant ? "Thêm phụ kiện implant" : "Thêm vật tư cho mượn");

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
      formName={resolvedFormName}
      addLabel={resolvedAddLabel}
      emptyLabel={isImplantVariant ? "Không có phụ kiện implant nào." : "Không có vật tư cho mượn nào."}
      dialogTitle={itemLabel}
      buildItem={(draft, submittedValues) => ({
        ...draft,
        ...normalizeItem(submittedValues as OrderItemMaterialModel, showStatus),
      })}
      canEditItem={() => true}
      canRemoveItem={(item) => !item.isCloneable}
      getDeleteMessage={(item) => `Bạn có chắc muốn xóa ${getMaterialLabel(item)}?`}
      columns={[
        {
          key: "name",
          header: isImplantVariant ? "Tên phụ kiện" : "Tên vật tư",
          render: (item) => getMaterialLabel(item),
        },
        {
          key: "quantity",
          header: "Số lượng",
          width: 110,
          align: "right",
          render: (item) => (Number(item.quantity) || 0).toLocaleString("vi-VN"),
        },
        ...(showStatus
          ? [
              {
                key: "status",
                header: "Trạng thái",
                width: 140,
                render: (item: OrderItemMaterialModel) => item.status || "—",
              },
            ]
          : []),
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
