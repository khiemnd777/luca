import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { reloadTable } from "@core/table/table-reload";

import {
  createImportFieldMapping,
  updateImportFieldMapping,
} from "@core/metadata/data/import.api";
import type { ImportFieldMappingModel } from "@core/metadata/data/import.model";
import { mapper } from "@root/core/mapper/auto-mapper";

const KIND_OPTIONS = [
  { label: "Core field", value: "core" },
  { label: "Metadata field", value: "metadata" },
  { label: "External field", value: "external" },
];

const DATA_TYPE_OPTIONS = [
  "text",
  "number",
  "date",
  "datetime",
  "boolean",
].map((t) => ({ label: t, value: t }));

export function buildMetadataImportMappingSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "internalKind",
      label: "Internal kind",
      kind: "select",
      options: KIND_OPTIONS,
      rules: {
        required: "Internal kind is required",
      },
      helperText: 'e.g. "core", "metadata", "external"',
    },
    {
      name: "internalPath",
      label: "Internal path",
      kind: "text",
      helperText:
        'Internal key/path, e.g. "name", "phone_number", "tax_code"...',
      rules: {
        required: "Internal path is required",
        maxLength: 200,
      },
    },
    {
      name: "internalLabel",
      label: "Internal label",
      kind: "text",
      rules: {
        required: "Label is required",
        maxLength: 200,
      },
    },

    {
      name: "metadataCollectionSlug",
      label: "Metadata collection slug",
      kind: "text",
      helperText: 'Optional, e.g. "clinic"',
    },
    {
      name: "metadataFieldName",
      label: "Metadata field name",
      kind: "text",
      helperText: 'Optional, matches metadata field "name"',
    },

    // Excel side
    {
      name: "dataType",
      label: "Data type",
      kind: "select",
      options: DATA_TYPE_OPTIONS,
      helperText: 'Optional, e.g. "text", "number", "date"...',
    },
    {
      name: "excelHeader",
      label: "Excel header",
      kind: "text",
      helperText: "Column header in Excel (if any)",
    },
    {
      name: "excelColumn",
      label: "Excel column index",
      kind: "number",
      helperText: "1 = A, 2 = B, ...",
      rules: {
        min: 1,
      },
    },

    // Flags
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

    // Transform
    {
      name: "transformHint",
      label: "Transform hint",
      kind: "textarea",
      rows: 2,
      helperText:
        'Optional, e.g. "trim|upper" or "date:dd/MM/yyyy" - just a hint for parser',
    },
  ];

  return {
    idField: "id",
    fields,
    submit: {
      create: {
        type: "fn",
        run: async (values: any) => {
          const result = await createImportFieldMapping(values.dto);
          return result;
        },
      },
      update: {
        type: "fn",
        run: async (values: any) => {
          const result = await updateImportFieldMapping(values.dto.id, values.dto);
          return result;
        },
      },
    },

    async initialResolver(data: any) {
      console.log(data);
      if (data) {
        return data;
      }
      return {
        excelColumn: 1,
      };
    },

    afterSaved() {
      reloadTable("import-mappings");
    },

    hooks: {
      mapToDto: (v) =>
        mapper.map<any, ImportFieldMappingModel>("Common", v, "model_to_dto"),
    },
  };
}

registerFormDialog(
  "import-mapping",
  buildMetadataImportMappingSchema,
  {
    title: { create: "New field mapping", update: "Edit field mapping" },
    confirmText: { create: "Create", update: "Save" },
    cancelText: "Cancel",
  }
);
