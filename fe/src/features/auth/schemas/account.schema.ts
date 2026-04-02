import type { FieldDef } from "@core/form/types";
import type { FormSchema, SubmitDef } from "@core/form/form.types";
import { uploadImages } from "@core/form/image-upload-utils";
import { mapper } from "@root/core/mapper/auto-mapper";
import { existsEmail, existsPhone, updateMe } from "@root/core/network/me.api";
import type { MeModel } from "@core/auth/auth.types";
import { registerForm } from "@core/form/form-registry";
import { useAuthStore } from "@root/store/auth-store";

export function buildAccountSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "name",
      label: "Tên hiển thị",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên hiển thị",
        maxLength: 50,
      },
    },
    {
      name: "email",
      label: "Email",
      kind: "email",
      rules: {
        required: "Yêu cầu nhập địa chỉ email",
        maxLength: 300,
        async: async (val: string | null) => {
          if (!val) return null;
          if (val) {
          }
          const existed = await existsEmail(val);
          return existed ? `Email ${val} đã tồn tại, vui lòng chọn email khác.` : null;
        }
      },
    },
    {
      name: "phone",
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
          const existed = await existsPhone(val);
          if (existed) {
            return `Số ${val} đã tồn tại, vui lòng chọn số khác.`;
          }
          return null;
        },
      },
      helperText: "Có thể nhập +84 hoặc không.",
    },
    {
      name: "avatar",
      label: "Ảnh đại diện",
      kind: "imageupload",
      accept: "image/*",
      maxFiles: 1,
      multipleFiles: false,
      helperText: "PNG/JPG ≤ 2MB. Khuyến nghị hình vuông.",
      uploader: uploadImages,
    },
  ];

  const submit: SubmitDef = {
    type: "fn",
    run: async (values) => {
      await updateMe(values.dto as MeModel);
    }
  };

  return {
    fields,
    initialResolver() {
      return useAuthStore.getState().user;
    },
    async afterSaved() {
      await useAuthStore.getState().fetchMe();
    },
    toasts: {
      saved: "Lưu tài khoản thành công!",
      failed: "Lưu thất bại, xin thử lại!",
    },
    submit,
    hooks: {
      mapToDto: (v) => mapper.map("Me", v, "model_to_dto"),
    }
  };
}

registerForm("account", buildAccountSchema);
