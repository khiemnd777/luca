import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import type { CategoryModel } from "@features/category/model/category.model";
import { table, unlink } from "@features/category/api/category.api";
import { navigate } from "@root/core/navigation/navigate";
import CategoryView from "../components/category-view";

const columns: ColumnDef<CategoryModel>[] = [
  {
    key: "name",
    header: "Danh mục",
    sortable: false,
    labelField: true,
    render(item) {
      return <CategoryView key={item.id} item={item} />
    }
    ,
  },
  {
    key: "",
    type: "metadata",
    metadata: {
      collection: "category",
      mode: "whole",
    }
  },
];

registerTable("categories", () => {
  return createTableSchema<CategoryModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await table(opts),
    initialPageSize: 50,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["product.update"],
    allowDeleting: ["product.delete"],
    onEdit(row: CategoryModel) {
      // openFormDialog("category", { initial: { id: row.id } });
      navigate(`/category/${row.id}`);
    },
    // onView(row: CategoryModel) {
    //   navigate(`/category/${row.id}`);
    // },
    async onDelete(row) {
      await unlink(row.id);
      reloadTable("categories");
    },
  });
});
