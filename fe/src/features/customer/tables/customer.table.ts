import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import { openFormDialog } from "@core/form/form-dialog.service";
import type { CustomerModel } from "@features/customer/model/customer.model";
import { table, unlink } from "@features/customer/api/customer.api";
import { navigate } from "@core/navigation/navigate";

const columns: ColumnDef<CustomerModel>[] = [
  { key: "code", header: "Mã khách hàng", sortable: true, },
  { key: "name", header: "Tên khách hàng", sortable: true, labelField: true },
  {
    key: "",
    type: "metadata",
    metadata: {
      collection: "customer",
      mode: "whole",
    }
  },
];

registerTable("customers", () => {
  return createTableSchema<CustomerModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await table(opts),
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["customer.update"],
    allowDeleting: ["customer.delete"],
    onView(row: CustomerModel) {
      navigate(`/customer/${row.id}`);
    },
    onEdit(row: CustomerModel) {
      openFormDialog("customer", { initial: { id: row.id } });
    },
    async onDelete(row) {
      await unlink(row.id);
      reloadTable("customers");
    },
  });
});
