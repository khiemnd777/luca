import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { uploadImages } from "@core/form/image-upload-utils";
import { mapper } from "@core/mapper/auto-mapper";
import type { StaffModel } from "@features/staff/model/staff.model";
import { addExistingToDepartment, create, createForDepartment, existsEmail, existsPhone, id, search, update } from "@features/staff/api/staff.api";
import { reloadTable } from "@core/table/table-reload";
import { search as searchSection, tableByStaffId } from "@features/section/api/section.api";
import { openFormDialog } from "@core/form/form-dialog.service";
import { fetchRolesByUserId, search as searchRoles } from "@root/features/rbac/api/rbac.api";
import SearchSingleField from "@core/form/search-single-field";
import { Avatar, Box, Chip, Stack, Typography } from "@mui/material";
import type { RoleModel } from "@features/rbac/model/role.model";
import { useDisplayUrl } from "@core/photo/use-display-url";

type Options = {
  withPassword: boolean;
  passwordRequired?: boolean;
  createDepartmentId?: number;
  reloadTableNames?: string[];
  withExistingStaffSearch?: boolean;
};

const EXISTING_STAFF_PASSWORD_PLACEHOLDER = "existing-user-not-updated";

function isAssignableStaffRole(role: RoleModel | null | undefined): role is RoleModel {
  return Boolean(role && role.roleName?.trim().toLowerCase() !== "admin");
}

function firstPositiveNumber(...values: any[]): number {
  for (const value of values) {
    const num = Number(value ?? 0);
    if (num > 0) return num;
  }
  return 0;
}

function isAddingExistingStaff(opts: Options, values: Record<string, any>): boolean {
  if (!opts.withExistingStaffSearch) return false;
  const existingStaffUserId = firstPositiveNumber(values.existingStaffId, values.existing_staff_id, values.id);
  return existingStaffUserId > 0;
}

function ExistingStaffAvatar({ staff }: { staff: StaffModel }) {
  const avatarUrl = useDisplayUrl(staff.avatar);

  return (
    <Avatar src={avatarUrl || undefined} sx={{ width: 28, height: 28 }}>
      {(staff.name || "?").slice(0, 1)}
    </Avatar>
  );
}

function passwordField(opts: Options): FieldDef {
  return {
    name: "password",
    label: "Password",
    kind: "password",
    showIf: (values) => !(opts.withExistingStaffSearch && Number(values.id ?? 0) > 0),
    rules: {
      ...(opts.withPassword && opts.passwordRequired ? {
        required: "Yêu cầu nhập mật khẩu",
      } : {}),
      minLength: 6,
      maxLength: 128
    },
  };
}

function fillExistingStaff(values: StaffModel | null, setValue: (name: string, value: any) => void) {
  if (!values) {
    setValue("id", 0);
    setValue("existingStaffId", null);
    setValue("password", "");
    return;
  }

  setValue("id", values.id);
  setValue("existingStaffId", values.id);
  setValue("name", values.name ?? "");
  setValue("email", values.email ?? "");
  setValue("phone", values.phone ?? "");
  setValue("avatar", values.avatar ?? "");
  setValue("active", values.active ?? true);
  setValue("roleIds", values.roleIds ?? []);
  setValue("sectionIds", values.sectionIds ?? []);
  setValue("customFields", values.customFields ?? null);
  setValue("password", EXISTING_STAFF_PASSWORD_PLACEHOLDER);
}

function existingStaffSearchField(): FieldDef {
  return {
    name: "existingStaffId",
    label: "Tìm nhân sự",
    kind: "custom",
    fullWidth: true,
    render: ({ values, ctx }) => (
      <Box sx={{ pt: 1 }}>
        <SearchSingleField<StaffModel>
          name="existingStaffId"
          label="Tìm nhân sự"
          placeholder="Tìm theo tên, số điện thoại hoặc email"
          selectedId={Number(values.id ?? 0) > 0 ? Number(values.id) : null}
          values={values}
          ctx={ctx ?? undefined}
          search={async (keyword) => {
            const result = await search({ keyword, page: 1, limit: 20, orderBy: "name" });
            return result.items ?? [];
          }}
          searchPage={async (keyword, page, limit) => {
            const result = await search({ keyword, page, limit, orderBy: "name" });
            return result.items ?? [];
          }}
          hydrateById={async (selectedId) => {
            const userId = Number(selectedId);
            if (!userId || userId <= 0) return null;
            return id(userId);
          }}
          onChange={(_value, staff) => {
            if (!ctx) return;
            fillExistingStaff(staff, ctx.setValue);
          }}
          getOptionLabel={(staff) => staff?.name ?? ""}
          getOptionValue={(staff) => staff.id}
          getInputLabel={(staff) => {
            const parts = [staff?.name, staff?.phone, staff?.email].filter(Boolean);
            return parts.join(" - ");
          }}
          renderItem={(staff) => (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
              <ExistingStaffAvatar staff={staff} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" noWrap>
                  {staff.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {[staff.phone, staff.email].filter(Boolean).join(" - ")}
                </Typography>
              </Box>
              {staff.departmentId ? (
                <Chip
                  size="small"
                  label={`Chi nhánh ${staff.departmentName || `#${staff.departmentId}`}`}
                />
              ) : null}
            </Stack>
          )}
          helperText="Chọn nhân sự có sẵn để thêm vào chi nhánh hiện tại mà không tạo tài khoản mới."
          pageLimit={20}
        />
      </Box>
    ),
  };
}

function commonFields(opts: Options): FieldDef[] {
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
        async: async (val: string | null, values) => {
          if (!val) return null;
          if (isAddingExistingStaff(opts, values)) return null;
          const existed = await existsEmail({ id: values.id, email: val });
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
        async: async (val: string | null, values) => {
          if (!val) return null;
          const ok = /^\+?\d{8,15}$/.test(val);
          if (!ok) return "Sai định dạng số điện thoại";
          if (isAddingExistingStaff(opts, values)) return null;
          const existed = await existsPhone({ id: values.id, phone: val });
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
        return (searched.items ?? []).filter(isAssignableStaffRole);
      },
      pageLimit: 20,

      async hydrateByIds(ids: Array<number | string>, values: Record<string, any>) {
        if (!ids || ids.length === 0) return [];
        const table = await fetchRolesByUserId(values.id, { limit: 20, page: 1, orderBy: "display_name" });
        const set = new Set(ids.map(String));
        return (table.items ?? []).filter((d) => set.has(String(d.id)) && isAssignableStaffRole(d));
      },

      async fetchList(values: Record<string, any>) {
        const table = await fetchRolesByUserId(values.id, { limit: 20, page: 1, orderBy: "display_name" });
        return (table.items ?? []).filter(isAssignableStaffRole);
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
  const fields = [...commonFields(opts)];
  if (opts.withExistingStaffSearch) {
    fields.unshift(existingStaffSearchField());
  }
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
          const dto = values.dto as StaffModel & Record<string, any>;
          const resolvedDepartmentId = firstPositiveNumber(opts.createDepartmentId, dto.departmentId, dto.department_id);
          const existingStaffUserId = firstPositiveNumber(dto.existingStaffId, dto.existing_staff_id, dto.id);
          if (opts.withExistingStaffSearch && existingStaffUserId > 0) {
            if (resolvedDepartmentId <= 0) {
              throw new Error("Missing department id for existing staff assignment");
            }
            await addExistingToDepartment(resolvedDepartmentId, existingStaffUserId);
            return dto;
          }
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
