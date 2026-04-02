import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import { openFormDialog } from "@core/form/form-dialog.service";
import type { ProductModel } from "@features/product/model/product.model";
import { unlink, variantTable } from "@features/product/api/product.api";

const columns: ColumnDef<ProductModel>[] = [
  { key: "code", header: "Mã sản phẩm", sortable: true, },
  { key: "name", header: "Tên sản phẩm", sortable: true, labelField: true },
  { key: "categoryName", header: "Danh mục", sortable: true, },
  { key: "retailPrice", header: "Giá bán", type: "currency", sortable: true },
  { key: "costPrice", header: "Giá vốn", type: "currency", sortable: true },
  {
    key: "",
    type: "metadata",
    metadata: {
      collection: "product",
      mode: "whole",
    }
  },
  {
    key: "",
    type: "metadata",
    metadata: {
      group: "category",
      tag: "catalog",
      mode: "whole",
    }
  },
];

registerTable("product-variants", () => {
  return createTableSchema<ProductModel>({
    columns,
    fetch: async (opts: FetchTableOpts & Record<string, any>) => await variantTable(opts.templateId, opts),
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["product.update"],
    allowDeleting: ["product.delete"],
    onEdit(row: ProductModel) {
      openFormDialog("product-variant", { initial: { id: row.id } });
    },
    // onView(row: ProductModel) {
    //   navigate(`/product/${row.id}`);
    // },
    async onDelete(row) {
      await unlink(row.id);
      reloadTable("product-variants");
    },
  });
});
