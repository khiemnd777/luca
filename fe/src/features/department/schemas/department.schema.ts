import React from "react";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { uploadImages } from "@root/core/form/image-upload-utils";
import { reloadTable } from "@core/table/table-reload";
import { create, getById, update } from "@features/department/api/department.api";
import type { DeparmentModel } from "@features/department/model/department.model";
import { Loading } from "@shared/components/ui/loading";
import {
  normalizeDepartmentSubmitDto,
  validateDepartmentPhoneNumber,
} from "@features/department/utils/department-phone.utils";

export function buildDeparmentSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "name",
      label: "Tên chi nhánh",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên chi nhánh",
        maxLength: 120,
      },
    },
    {
      name: "phoneNumber",
      label: "Số điện thoại 1",
      kind: "text",
      rules: {
        maxLength: 20,
        async: async (val: string | null) => validateDepartmentPhoneNumber(val),
      },
    },
    {
      name: "phoneNumber2",
      label: "Số điện thoại 2",
      kind: "text",
      rules: {
        maxLength: 20,
        async: async (val: string | null) => validateDepartmentPhoneNumber(val),
      },
    },
    {
      name: "phoneNumber3",
      label: "Số điện thoại 3",
      kind: "text",
      rules: {
        maxLength: 20,
        async: async (val: string | null) => validateDepartmentPhoneNumber(val),
      },
    },
    {
      name: "address",
      label: "Địa chỉ",
      kind: "text",
      rules: {
        maxLength: 300,
      },
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
      rules: {
        maxLength: 50,
      },
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
      helperText: "PNG/JPG ≤ 2MB. Dùng cho sidebar desktop và phiếu giao hàng.",
      uploader: uploadImages,
    },
    {
      name: "active",
      label: "Kích hoạt",
      kind: "switch",
      defaultValue: true,
    },
  ];

  return {
    idField: "id",
    fields,
    submit: {
      create: {
        type: "fn",
        run: async (values) => {
          const dto = values as DeparmentModel;
          const deptId = Number(dto.parentId ?? dto.id ?? 0);
          return await create(deptId, dto);
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          const dto = values as DeparmentModel;
          const deptId = Number(dto.id ?? 0);
          return await update(deptId, dto);
        },
      },
    },
    async initialResolver(data: unknown) {
      const initial = data as { id?: unknown } | null | undefined;
      if (initial?.id) {
        return await getById(Number(initial.id));
      }
      return {};
    },
    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo chi nhánh "${values?.name ?? ""}" thành công!`
          : `Cập nhật chi nhánh "${values?.name ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo chi nhánh "${values?.name ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật chi nhánh "${values?.name ?? ""}" thất bại, xin thử lại!`,
    },
    hooks: {
      mapToDto: (v) => normalizeDepartmentSubmitDto(v),
    },
    async afterSaved() {
      reloadTable("department-children");
    },
  };
}

registerForm("department", buildDeparmentSchema);

registerFormDialog("department", buildDeparmentSchema, {
  title: { create: "Thêm chi nhánh", update: "Cập nhật chi nhánh" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
  submittingTitle: "Đang khởi tạo dữ liệu chi nhánh",
  submittingContent: React.createElement(Loading, {
    text: "Hệ thống đang tạo chi nhánh và đồng bộ dữ liệu mặc định. Vui lòng chờ đến khi hoàn tất.",
  }),
});
