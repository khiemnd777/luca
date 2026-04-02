import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import { openFormDialog } from "@core/form/form-dialog.service";
import { navigate } from "@root/core/navigation/navigate";
import { list, remove } from "@root/features/promotion/api/promotion-admin.api";
import type { PromotionCodeModel } from "@features/promotion/model/promotion.model";
import {
  PROMOTION_CONDITION_LABEL_MAP,
  PROMOTION_DISCOUNT_LABEL_MAP,
  PROMOTION_SCOPE_LABEL_MAP,
} from "@features/promotion/model/promotion.const";

const numberFormatter = new Intl.NumberFormat("vi-VN");

function formatCurrency(value: number) {
  return numberFormatter.format(value);
}

const columns: ColumnDef<PromotionCodeModel>[] = [
  { key: "code", header: "Mã khuyến mãi", sortable: true, labelField: true },
  { key: "name", header: "Tên khuyến mãi", sortable: true, width: 200 },
  {
    key: "discountType",
    header: "Loại",
    type: "chips",
    sortable: true,
    accessor: (row) => PROMOTION_DISCOUNT_LABEL_MAP[row.discountType as keyof typeof PROMOTION_DISCOUNT_LABEL_MAP]
      ?? row.discountType,
  },
  {
    key: "discountValue",
    header: "Giá trị giảm",
    sortable: true,
    type: "number",
    render: (row) => {
      const value = row.discountValue ?? 0;
      return row.discountType === "percent"
        ? `${numberFormatter.format(value)}%`
        : formatCurrency(value);
    },
  },
  {
    key: "conditions",
    header: "Điều kiện",
    type: "chips",
    accessor: (row) =>
      row.conditions?.map(
        (condition) =>
          PROMOTION_CONDITION_LABEL_MAP[
            condition.conditionType as keyof typeof PROMOTION_CONDITION_LABEL_MAP
          ] ?? condition.conditionType
      ) ?? [],
  },
  {
    key: "scopes",
    header: "Phạm vi",
    type: "chips",
    accessor: (row) =>
      row.scopes?.map(
        (scope) =>
          PROMOTION_SCOPE_LABEL_MAP[
            scope.scopeType as keyof typeof PROMOTION_SCOPE_LABEL_MAP
          ] ?? scope.scopeType
      ) ?? [],
  },
  { key: "startAt", header: "Bắt đầu", sortable: true, type: "datetime" },
  { key: "endAt", header: "Kết thúc", sortable: true, type: "datetime" },
  { key: "isActive", header: "Kích hoạt", type: "boolean" },
];

registerTable("promotions", () => {
  return createTableSchema<PromotionCodeModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await list(opts),
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["promotion.update"],
    allowDeleting: ["promotion.delete"],
    onEdit(row: PromotionCodeModel) {
      openFormDialog("promotion", { initial: { id: row.id } });
    },
    onView(row: PromotionCodeModel) {
      navigate(`/promotion/${row.id}`);
    },
    async onDelete(row) {
      await remove(row.id);
      reloadTable("promotions");
    },
  });
});
