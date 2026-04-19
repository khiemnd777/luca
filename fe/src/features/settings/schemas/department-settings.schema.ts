import type { FieldDef } from "@core/form/types";
import type { FormSchema, SubmitDef } from "@core/form/form.types";
import { uploadImages } from "@root/core/form/image-upload-utils";
import { updateDepartment } from "@features/settings/api/department.api";
import { registerForm } from "@root/core/form/form-registry";
import { useAuthStore } from "@root/store/auth-store";
import type { MyDepartmentDto } from "@root/core/network/my-department.dto";
import {
  normalizeDepartmentSubmitDto,
  validateDepartmentPhoneNumber,
} from "@features/department/utils/department-phone.utils";

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
      label: "Số điện thoại 1",
      kind: "text",
      placeholder: "+84xxxxxxxxx",
      rules: {
        async: async (val: string | null) => validateDepartmentPhoneNumber(val),
      },
      helperText: "Có thể nhập +84 hoặc không.",
    },
    {
      name: "phoneNumber2",
      label: "Số điện thoại 2",
      kind: "text",
      placeholder: "+84xxxxxxxxx",
      rules: {
        async: async (val: string | null) => validateDepartmentPhoneNumber(val),
      },
      helperText: "Chỉ hiển thị khi có giá trị.",
    },
    {
      name: "phoneNumber3",
      label: "Số điện thoại 3",
      kind: "text",
      placeholder: "+84xxxxxxxxx",
      rules: {
        async: async (val: string | null) => validateDepartmentPhoneNumber(val),
      },
      helperText: "Chỉ hiển thị khi có giá trị.",
    },
    {
      name: "email",
      label: "Email",
      kind: "text",
      rules: {
        maxLength: 120,
      },
    },
    {
      name: "tax",
      label: "Mã số thuế",
      kind: "text",
      rules: { maxLength: 50 },
    },
    {
      name: "logo",
      label: "Logo vuông",
      kind: "imageupload",
      accept: "image/*",
      maxFiles: 1,
      multipleFiles: false,
      helperText: "PNG/JPG ≤ 2MB. Khuyến nghị hình vuông.",
      uploader: uploadImages,
    },
    {
      name: "logoRect",
      label: "Logo chữ nhật",
      kind: "imageupload",
      accept: "image/*",
      maxFiles: 1,
      multipleFiles: false,
      imagePreviewAspectRatio: "16 / 6",
      imagePreviewHeight: 96,
      helperText: "PNG/JPG ≤ 2MB. Dùng cho sidebar desktop và phiếu giao hàng.",
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
      return updateDepartment(values as Partial<MyDepartmentDto>);
    },
  };

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
      mapToDto: (v) => normalizeDepartmentSubmitDto(v),
    },
  };
}

registerForm("department-settings", buildDepartmentSettingsSchema);
