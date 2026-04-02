import { registerTable } from "@core/table/table-registry";
import {
  createTableSchema,
  type ColumnDef,
  type FetchTableOpts,
} from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import { openFormDialog } from "@core/form/form-dialog.service";

import type { ImportFieldMappingModel } from "@core/metadata/data/import.model";
import {
  listImportFieldMappings,
  deleteImportFieldMapping,
} from "@core/metadata/data/import.api";

const columns: ColumnDef<ImportFieldMappingModel>[] = [
  { key: "internalKind", header: "Kind" },
  { key: "internalPath", header: "Path" },
  { key: "internalLabel", header: "Field", labelField: true },
  { key: "excelColumn", header: "Excel Column" },
  { key: "excelHeader", header: "Excel header" },
  { key: "dataType", header: "Type" },
  { key: "required", header: "Required", type: "boolean" },
];

export type ImportMappingTableParams = {
  profileId: number;
};

registerTable(
  "import-mappings", () =>
  createTableSchema<ImportFieldMappingModel>({
    columns,

    async fetch(opts: FetchTableOpts & Record<string, any>) {
      const profileId = Number(opts.profileId ?? 0);
      if (!profileId) {
        return { items: [], total: 0 };
      }

      const items = await listImportFieldMappings({ profileId });
      return {
        items,
        total: items.length,
      };
    },

    allowUpdating: ["privilege.metadata"],
    allowDeleting: ["privilege.metadata"],

    onEdit(row) {
      openFormDialog("import-mapping", {
        initial: { ...row },
      });
    },

    async onDelete(row) {
      await deleteImportFieldMapping(row.id);
      reloadTable("import-mappings");
    },
  })
);
