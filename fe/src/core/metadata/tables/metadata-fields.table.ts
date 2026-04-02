import { registerTable } from "@core/table/table-registry";
import {
  createTableSchema,
  type ColumnDef,
  type FetchTableOpts,
} from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import { openFormDialog } from "@core/form/form-dialog.service";

import type { FieldModel } from "@core/metadata/data/metadata.model";
import {
  listFieldsByCollection,
  deleteField,
  sort,
} from "@core/metadata/data/metadata.api";

const columns: ColumnDef<FieldModel>[] = [
  { key: "label", header: "Label", width: 290, },
  { key: "name", header: "Name", labelField: true, },
  { key: "tag", header: "Tag", },
  {
    key: "type",
    header: "Type",
    width: 90,
  },
  {
    key: "visibility",
    header: "Visibility",
    width: 90,
  },
  {
    key: "required",
    header: "Required?",
    type: "boolean",
    width: 90,
  },
  {
    key: "unique",
    header: "Unique?",
    type: "boolean",
    width: 90,
  },
  {
    key: "table",
    header: "Table?",
    type: "boolean",
    width: 90,
  },
  {
    key: "form",
    header: "Form?",
    type: "boolean",
    width: 90,
  },
  {
    key: "search",
    header: "Search?",
    type: "boolean",
    width: 90,
  },
];

registerTable('metadata-fields', () =>
  createTableSchema<FieldModel>({
    columns,
    fetch: async (opts: FetchTableOpts & Record<string, any>) => {
      const list = await listFieldsByCollection(opts.collectionId as number);
      return {
        items: list,
        total: list?.length ?? 0,
      };
    },

    initialPageSize: 50,
    initialSort: { by: "orderIndex", dir: "asc" },

    allowUpdating: ["privilege.metadata"],
    allowDeleting: ["privilege.metadata"],

    onEdit(row) {
      openFormDialog("metadata-field", {
        initial: { ...row },
      });
    },

    onReorder: async (newRows, from, to) => {
      console.log("moved row", from, "->", to, newRows);
      await sort(newRows[0].collectionId, newRows.map((r) => r.id));
    },

    async onDelete(row) {
      await deleteField(row.id);
      reloadTable('metadata-fields');
    },
  })
);
