import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { uploadImages } from "@core/form/image-upload-utils";
import { mapper } from "@core/mapper/auto-mapper";
import type { StaffModel } from "@features/staff/model/staff.model";
import { create, createForDepartment, existsEmail, existsPhone, id, update } from "@features/staff/api/staff.api";
import { reloadTable } from "@core/table/table-reload";
import { search as searchSection, tableByStaffId } from "@features/section/api/section.api";
import { openFormDialog } from "@core/form/form-dialog.service";
import { fetchRolesByUserId, search as searchRoles } from "@root/features/rbac/api/rbac.api";

type Options = {
  withPassword: boolean;
  passwordRequired?: boolean;
  createDepartmentId?: number;
  reloadTableNames?: string[];
};

function passwordField(opts: Options): FieldDef {
  return {
    name: "password",
    label: "Password",
    kind: "password",
    rules: {
      ...(opts.withPassword && opts.passwordRequired ? {
        required: "Yêu cầu nhập mật khẩu",
      } : {}),
      minLength: 6,
      maxLength: 128
    },
  };
}

function commonFields(): FieldDef[] {
  return [
    {
      name: "name",
      label: "Tên hiển thị",
      kind: "text",
      rules: { required: "Yêu cầu nhập tên hiển thị", maxLength: 50 },
    },
    {
      name: "email",
      label: "Email",
      kind: "email",
      rules: {
        required: "Yêu cầu nhập địa chỉ email",
        maxLength: 300,
        async: async (val: string | null, { id }) => {
          if (!val) return null;
          const existed = await existsEmail({ id, email: val });
          return existed ? `Email ${val} đã tồn tại, vui lòng chọn email khác.` : null;
        },
      },
    },
    {
      name: "phone",
      label: "Số điện thoại",
      kind: "text",
      placeholder: "+84xxxxxxxxx",
      rules: {
        required: "Yêu cầu nhập số điện thoại",
        async: async (val: string | null, { id }) => {
          if (!val) return null;
          const ok = /^\+?\d{8,15}$/.test(val);
          if (!ok) return "Sai định dạng số điện thoại";
          const existed = await existsPhone({ id, phone: val });
          return existed ? `Số ${val} đã tồn tại, vui lòng chọn số khác.` : null;
        },
      },
      helperText: "Có thể nhập +84 hoặc không.",
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "staff",
        mode: "whole",
      }
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
    {
      name: "active",
      label: "Kích hoạt",
      kind: "switch",
      defaultValue: true,
    },
    // ---- Roles ----
    {
      name: "roleIds",
      label: "Vai trò",
      kind: "searchlist",
      placeholder: "Tìm vai trò phù hợp cho nhân sự…",
      fullWidth: true,

      getOptionLabel: (d: any) => d?.displayName,
      getOptionValue: (d: any) => d?.id,

      async searchPage(kw: string, page: number, limit: number) {
        const searched = await searchRoles({ keyword: kw, limit, page, orderBy: "display_name" });
        return searched.items;
      },
      pageLimit: 20,

      async hydrateByIds(ids: Array<number | string>, values: Record<string, any>) {
        if (!ids || ids.length === 0) return [];
        const table = await fetchRolesByUserId(values.id, { limit: 20, page: 1, orderBy: "display_name" });
        const set = new Set(ids.map(String));
        return (table.items ?? []).filter((d: any) => set.has(String(d.id)));
      },

      async fetchList(values: Record<string, any>) {
        const table = await fetchRolesByUserId(values.id, { limit: 20, page: 1, orderBy: "display_name" });
        return table.items;
      },

      onDragEnd(items) {
        console.log(items);
      },

      renderItem: (d: any) => <> {d.displayName} </>,
      disableDelete: (d: any) => d.locked === true,
      onOpenCreate: () => openFormDialog("role"),
      autoLoadAllOnMount: true,
    },
    // ---- Sections ----
    {
      name: "sectionIds",
      label: "Bộ phận",
      kind: "searchlist",
      placeholder: "Tìm bộ phận nhân sự trực thuộc…",
      fullWidth: true,

      getOptionLabel: (d: any) => d.name,
      getOptionValue: (d: any) => d.id,

      async searchPage(kw: string, page: number, limit: number) {
        const searched = await searchSection({ keyword: kw, limit, page, orderBy: "name" });
        return searched.items;
      },
      pageLimit: 20,

      async hydrateByIds(ids: Array<number | string>, values: Record<string, any>) {
        if (!ids || ids.length === 0) return [];
        const table = await tableByStaffId(values.id, { limit: 20, page: 1, orderBy: "name" });
        const set = new Set(ids.map(String));
        return (table.items ?? []).filter((d: any) => set.has(String(d.id)));
      },

      async fetchList(values: Record<string, any>) {
        const table = await tableByStaffId(values.id, { limit: 20, page: 1, orderBy: "name" });
        return table.items;
      },

      renderItem: (d: any) => <> {d.name} </>,
      disableDelete: (d: any) => d.locked === true,
      onOpenCreate: () => openFormDialog("section"),
      autoLoadAllOnMount: true,
    },
  ];
}

export function buildStaffSchemaShared(opts: Options): FormSchema {
  const fields = [...commonFields()];
  if (opts.withPassword) {
    // chèn password ngay sau phone (index 2 là phone, vậy password ở 3)
    fields.splice(3, 0, passwordField(opts));
  }

  return {
    idField: "id",
    fields,
    submit: {
      create: {
        type: "fn",
        run: async (values) => {
          const dto = values.dto as StaffModel;
          const resolvedDepartmentId = opts.createDepartmentId && opts.createDepartmentId > 0
            ? opts.createDepartmentId
            : Number(dto.departmentId ?? 0);
          if (resolvedDepartmentId > 0) {
            await createForDepartment(resolvedDepartmentId, dto);
          } else {
            await create(dto);
          }
          return dto;
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          await update(values.dto as StaffModel);
          return values.dto;
        },
      },
    },
    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo nhân sự "${values?.name ?? ""}" thành công!`
          : `Cập nhật nhân sự "${values?.name ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo nhân sự "${values?.name ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật nhân sự "${values?.name ?? ""}" thất bại, xin thử lại!`,
    },
    async initialResolver(data: any) {
      if (data) {
        return await id(data.id);
      }
      return {};
    },
    async afterSaved() {
      const tableNames = new Set(["staffs", ...(opts.reloadTableNames ?? [])]);
      tableNames.forEach((tableName) => reloadTable(tableName));
    },
    hooks: {
      mapToDto: (v) => mapper.map("Staff", v, "model_to_dto"),
    },
  };
}
