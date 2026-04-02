import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { reloadTable } from "@core/table/table-reload";

import type { CollectionModel, CollectionWithFieldsModel } from "@core/metadata/data/metadata.model";
import {
  createCollection,
  updateCollection,
  getCollection,
} from "@core/metadata/data/metadata.api";
import { mapper } from "@root/core/mapper/auto-mapper";
import { registerForm } from "@root/core/form/form-registry";

export function buildMetadataCollectionSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "slug",
      label: "Slug",
      kind: "text",
      placeholder: "e.g. product_attributes",
      rules: {
        required: "Slug is required",
        maxLength: 100,
      },
      helperText: "lowercase, dash-separated (ví dụ: product-attributes)",
    },
    {
      name: "name",
      label: "Name",
      kind: "text",
      rules: {
        required: "Name is required",
        maxLength: 200,
      },
    },
    {
      name: "showIf",
      label: "Show if (JSON)",
      kind: "textarea",
      helperText: 'e.g. { "field": "products.customFields.productCode", "op": "equals", "value": "ABC123" }',
      rows: 2,
    },
  ];

  return {
    idField: "id",
    fields,
    submit: {
      create: {
        type: "fn",
        run: async (values) => {
          await createCollection(values.dto as CollectionModel);
          return values.dto;
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          await updateCollection(
            (values as any).dto.id,
            values.dto as CollectionModel,
          );
          return values.dto;
        },
      },
    },
    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Created collection "${values?.slug ?? ""}" successfully!`
          : `Updated collection "${values?.slug ?? ""}" successfully!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Failed to create collection "${values?.slug ?? ""}", please try again.`
          : `Failed to update collection "${values?.slug ?? ""}", please try again.`,
    },

    async initialResolver(data: any) {
      if (data?.id) {
        const result = await getCollection(data.id, false);
        return mapper.map<CollectionWithFieldsModel, CollectionModel>("Common", result, "dto_to_model");
      }
      return {};
    },

    async afterSaved() {
      reloadTable("metadata-collections");
    },

    hooks: {
      mapToDto: (v) => mapper.map<any, CollectionModel>("Common", v, "model_to_dto"),
    },
  };
}

registerForm("metadata-collection", buildMetadataCollectionSchema);

registerFormDialog("metadata-collection", buildMetadataCollectionSchema, {
  title: { create: "New collection", update: "Edit collection" },
  confirmText: { create: "Create", update: "Save" },
  cancelText: "Cancel",
});
