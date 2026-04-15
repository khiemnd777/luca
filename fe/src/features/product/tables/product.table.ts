import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import { openFormDialog } from "@core/form/form-dialog.service";
import type { ProductModel } from "@features/product/model/product.model";
import { table, unlink } from "@features/product/api/product.api";
import { navigate } from "@root/core/navigation/navigate";

const columns: ColumnDef<ProductModel>[] = [
  { key: "code", header: "Mã sản phẩm", width: 160, sortable: true, },
  { key: "name", header: "Tên sản phẩm", width: 360, sortable: true, labelField: true },
  { key: "categoryName", header: "Danh mục", width: 300, sortable: true, },
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

registerTable("products", () => {
  return createTableSchema<ProductModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await table(opts),
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["product.update"],
    allowDeleting: ["product.delete"],
    onEdit(row: ProductModel) {
      // openFormDialog("product", { initial: { id: row.id } });
      navigate(`/product/${row.id}`);
    },
    // onView(row: ProductModel) {
    //   navigate(`/product/${row.id}`);
    // },
    async onDelete(row) {
      await unlink(row.id);
      reloadTable("products");
    },
  });
});
