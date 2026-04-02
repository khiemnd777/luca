import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { reloadTable } from "@core/table/table-reload";

import { createField, updateField } from "@core/metadata/data/metadata.api";
import { mapper } from "@root/core/mapper/auto-mapper";
import { FIELD_TYPES, type FieldDto, type FieldModel } from "../data/metadata.model";

export function buildMetadataFieldSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "name",
      label: "Name",
      kind: "text",
      helperText: "internal key, snake_case / camelCase",
      rules: {
        required: "Name is required",
        maxLength: 100,
      },
    },
    {
      name: "label",
      label: "Label",
      kind: "text",
      rules: {
        required: "Label is required",
        maxLength: 200,
      },
    },
    {
      name: "tag",
      label: "Tag",
      kind: "text",
      rules: {
        maxLength: 50,
      },
    },
    {
      name: "type",
      label: "Type",
      kind: "select",
      options: FIELD_TYPES.map((t) => ({ label: t, value: t })),
      rules: {
        required: "Type is required",
      },
    },
    {
      name: "required",
      label: "Required",
      kind: "switch",
    },
    {
      name: "unique",
      label: "Unique",
      kind: "switch",
    },
    {
      name: "table",
      label: "Table",
      kind: "switch",
    },
    {
      name: "form",
      label: "Form",
      kind: "switch",
    },
    {
      name: "search",
      label: "Search",
      kind: "switch",
    },
    {
      name: "orderIndex",
      label: "Order index",
      kind: "number",
      rules: {
        min: 0,
      },
    },
    {
      name: "visibility",
      label: "Visibility",
      kind: "select",
      rules: { required: "Please choose a kind of visibility" },
      options: [
        { label: "public", value: "public" },
        { label: "hidden", value: "hidden" },
        { label: "readonly", value: "readonly" },
      ],
      helperText: 'e.g. "public", "hidden", "readonly"',
    },
    {
      name: "defaultValue",
      label: "Default value (JSON/string)",
      kind: "textarea",
      rows: 2,
    },
    {
      name: "options",
      label: "Options (JSON)",
      kind: "textarea",
      helperText: 'e.g. ["a", "b", ...] or [{"label":"A", "value":"a"},{"label":"B", "value":"b"}, ...]',
      rows: 2,
    },
    {
      name: "relation",
      label: "Relation (JSON)",
      kind: "textarea",
      helperText: 'e.g. {"target":"product", "ref":"process", "type":"n|1", "form":"process","placeholder":"Tìm..."}',
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
          await createField(values.dto as FieldDto);
          return values.dto;
        },
      },
      update: {
        type: "fn",
        run: async (values: any) => {
          await updateField(values.dto.id, values.dto as FieldDto);
          return values.dto;
        },
      },
    },

    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Created field "${values?.name ?? ""}" successfully!`
          : `Updated field "${values?.name ?? ""}" successfully!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Failed to create field "${values?.name ?? ""}", please try again.`
          : `Failed to update field "${values?.name ?? ""}", please try again.`,
    },

    async initialResolver(data: any) {
      if (data) {
        return data;
      }
      return {
        orderIndex: (data?.nextOrderIndex as number | undefined) ?? 0,
      };
    },

    async afterSaved() {
      reloadTable("metadata-fields");
    },

    hooks: {
      mapToDto: (v) => mapper.map<any, FieldModel>("Common", v, "model_to_dto"),
    },
  };
}

registerFormDialog("metadata-field", buildMetadataFieldSchema, {
  title: { create: "New field", update: "Edit field" },
  confirmText: { create: "Create", update: "Save" },
  cancelText: "Cancel",
});
