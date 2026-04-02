import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { mapper } from "@core/mapper/auto-mapper";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@features/clinic/api/clinic.api";
import type { ClinicModel } from "@features/clinic/model/clinic.model";
import { uploadImages } from "@core/form/image-upload-utils";

export function buildClinicNonDentistSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "name",
      label: "Tên nha khoa",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên nha khoa",
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
      name: "address",
      label: "Địa chỉ",
      kind: "text",
      rules: {
        maxLength: 128,
      },
    },
    {
      name: "brief",
      label: "Mô tả",
      kind: "textarea",
      rules: {
        maxLength: 300,
      },
    },
    {
      name: "logo",
      label: "Logo",
      kind: "imageupload",
      accept: "image/*",
      maxFiles: 1,
      multipleFiles: false,
      helperText: "PNG/JPG ≤ 2MB. Khuyến nghị hình vuông.",
      uploader: uploadImages,
    },
  ];

  return {
    idField: "id",
    fields,
    submit: {
      create: {
        type: "fn",
        run: async (values) => {
          await create(values.dto as ClinicModel);
          return values.dto;
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          await update(values.dto as ClinicModel);
          return values.dto;
        },
      },
    },

    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo nha khoa "${values?.name ?? ""}" thành công!`
          : `Cập nhật nha khoa "${values?.name ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo nha khoa "${values?.name ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật nha khoa "${values?.name ?? ""}" thất bại, xin thử lại!`,
    },

    async initialResolver(data: any) {
      if (data) {
        return await id(data.id);
      }
      return {};
    },

    async afterSaved() {
      reloadTable("clinics");
    },

    hooks: {
      mapToDto: (v) => mapper.map("Clinic", v, "model_to_dto"),
    },
  };
}

registerFormDialog("clinic-non-dentist", buildClinicNonDentistSchema, {
  title: { create: "Thêm nha khoa", update: "Cập nhật nha khoa" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});
