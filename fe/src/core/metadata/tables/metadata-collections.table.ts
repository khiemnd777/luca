import { registerTable } from "@core/table/table-registry";
import {
  createTableSchema,
  type ColumnDef,
  type FetchTableOpts,
} from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import { navigate } from "@core/navigation/navigate";

import type { CollectionWithFieldsModel } from "@core/metadata/data/metadata.model";
import {
  listCollections,
  deleteCollection,
} from "@core/metadata/data/metadata.api";

const columns: ColumnDef<CollectionWithFieldsModel>[] = [
  {
    key: "slug",
    header: "Slug",
    sortable: true,
  },
  {
    key: "name",
    header: "Name",
    sortable: true,
    labelField: true,
  },
  {
    key: "fields",
    header: "Fields",
    type: "custom",
    render: (row) => {
      const anyRow = row as any;
      const count =
        (anyRow.fields?.length as number | undefined) ??
        (anyRow.fieldsCount as number | undefined) ??
        0;
      return count;
    },
  },
];

registerTable("metadata-collections", () =>
  createTableSchema<CollectionWithFieldsModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => {
      const limit = opts.limit ?? 50;
      const page = opts.page ?? 0;

      const res = await listCollections({
        query: "",
        limit: limit,
        offset: page,
        withFields: false,
      });

      return {
        items: res.data,
        total: res.total,
      };
    },

    initialPageSize: 50,
    initialSort: { by: "id", dir: "asc" },

    allowUpdating: ["privilege.metadata"],
    allowDeleting: ["privilege.metadata"],

    onEdit(row) {
      navigate(`/metadata/collection/${row.id}`);
    },

    async onDelete(row) {
      await deleteCollection(row.id);
      reloadTable("metadata-collections");
    },
  })
);
