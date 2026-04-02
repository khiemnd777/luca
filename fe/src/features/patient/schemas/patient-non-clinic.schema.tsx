import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { mapper } from "@core/mapper/auto-mapper";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { reloadTable } from "@core/table/table-reload";
import type { PatientModel } from "@features/patient/model/patient.model";
import { create, id, update } from "@features/patient/api/patient.api";

export function buildPatientNonClinicSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "name",
      label: "Tên bệnh nhân",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên bệnh nhân",
        maxLength: 50,
      },
    },
    {
      name: "phoneNumber",
      label: "Số điện thoại",
      kind: "text",
      placeholder: "+84xxxxxxxxx",
      rules: {
        async: async (val: string | null) => {
          if (!val) return null;
          const ok = /^\+?\d{8,15}$/.test(val);
          if (!ok) {
            return "Sai định dạng số điện thoại";
          }
          return null;
        },
      },
      helperText: "Có thể nhập +84 hoặc không.",
    },
    {
      name: "brief",
      label: "Mô tả",
      kind: "textarea",
      rules: {
        maxLength: 300,
      },
    },
  ];

  return {
    idField: "id",
    fields,
    submit: {
      create: {
        type: "fn",
        run: async (values) => {
          await create(values.dto as PatientModel);
          return values.dto;
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          await update(values.dto as PatientModel);
          return values.dto;
        },
      },
    },

    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo bệnh nhân "${values?.name ?? ""}" thành công!`
          : `Cập nhật bệnh nhân "${values?.name ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo bệnh nhân "${values?.name ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật bệnh nhân "${values?.name ?? ""}" thất bại, xin thử lại!`,
    },

    async initialResolver(data: any) {
      if (data) {
        return await id(data.id);
      }
      return {};
    },

    async afterSaved() {
      reloadTable("patients");
    },

    hooks: {
      mapToDto: (v) => mapper.map("Patient", v, "model_to_dto"),
    },
  };
}

registerFormDialog("patient-non-clinic", buildPatientNonClinicSchema, {
  title: { create: "Thêm bệnh nhân", update: "Cập nhật bệnh nhân" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});
