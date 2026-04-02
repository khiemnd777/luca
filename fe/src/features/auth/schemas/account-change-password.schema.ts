import type { FieldDef } from "@core/form/types";
import type { FormSchema, SubmitDef } from "@core/form/form.types";
import { changeMyPassword } from "@root/core/network/me.api";
import { registerForm } from "@root/core/form/form-registry";

export function buildAccountChangePasswordSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "password",
      kind: "change-password",
      label: "Đổi mật khẩu",
      currentLabel: "Mật khẩu hiện tại",
      newLabel: "Mật khẩu mới",
      confirmLabel: "Xác nhận mật khẩu mới",
      rules: {
        required: "Nhập mật khẩu",
      },
      passwordRules: {
        disallowReuseCurrent: false,
        minLength: 8,
        requireDigit: true,
        requireUpper: false,
        requireLower: false,
      },
    },
  ];

  const submit: SubmitDef = {
    type: "fn",
    run: async (values) => {
      const { current, password } = values.dto.password;
      await changeMyPassword(current, password);
    }
  };

  return {
    fields,
    toasts: {
      saved: "Thay đổi mật khẩu thành công!",
      failed: "Thay đổi mật khẩu thất bại, xin thử lại!",
    },
    submit,
  };
}

registerForm("account-change-password", buildAccountChangePasswordSchema);
