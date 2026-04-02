import type { FieldDef } from "@core/form/types";
import type { FormSchema, SubmitDef } from "@core/form/form.types";
import { uploadImages } from "@root/core/form/image-upload-utils";
import { mapper } from "@root/core/mapper/auto-mapper";
import { updateDepartment } from "@features/settings/api/department.api";
import { registerForm } from "@root/core/form/form-registry";
import { useAuthStore } from "@root/store/auth-store";

export function buildDepartmentSettingsSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "name",
      label: "Tên công ty",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên",
        minLength: 2,
        maxLength: 120,
      },
    },
    {
      name: "address",
      label: "Địa chỉ",
      kind: "text",
      rules: { maxLength: 300 },
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
          return ok ? null : "Invalid phone number";
        },
      },
      helperText: "Có thể nhập +84 hoặc không.",
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
    {
      name: "active",
      label: "Kích hoạt",
      kind: "switch",
    },
  ];

  const submit: SubmitDef = {
    type: "fn",
    run: async (values) => {
      return updateDepartment(values.dto);
    },
  }

  return {
    fields,
    initialResolver() {
      return useAuthStore.getState().department;
    },
    async afterSaved() {
      await useAuthStore.getState().fetchDepartment();
    },
    toasts: {
      saved: "Lưu thông tin trang thành công!",
      failed: "Lưu thất bại, xin thử lại!",
    },
    submit,
    hooks: {
      mapToDto: (v) => mapper.map("MyDepartment", v, "model_to_dto"),
    }
  };
}

registerForm("department-settings", buildDepartmentSettingsSchema);
