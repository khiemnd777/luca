import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef, FormContext } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { getOpenDialogs, openFormDialog } from "@core/form/form-dialog.service";
import { uploadImages } from "@root/core/form/image-upload-utils";
import { rel1, search } from "@root/core/relation/relation.api";
import { reloadTable } from "@core/table/table-reload";
import { create, getById, update } from "@features/department/api/department.api";
import type { DeparmentModel } from "@features/department/model/department.model";
import { useAuthStore } from "@store/auth-store";

function parsePositiveNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function resolveDeptId(ctx?: FormContext): number {
  return parsePositiveNumber(ctx?.values?.id ?? ctx?.values?.parentId);
}

function resolveDeptIdForCreateStaff(): number {
  const dialogs = getOpenDialogs();
  for (let i = dialogs.length - 1; i >= 0; i -= 1) {
    const d = dialogs[i];
    if (d.name !== "department") continue;
    const fromDialog = parsePositiveNumber(d.options?.initial?.id ?? d.options?.initial?.parentId);
    if (fromDialog > 0) return fromDialog;
  }

  const m = window.location.pathname.match(/\/department\/(\d+)$/);
  const fromPath = parsePositiveNumber(m?.[1]);
  if (fromPath > 0) return fromPath;

  return parsePositiveNumber(useAuthStore.getState().department?.id);
}

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
      label: "Số điện thoại",
      kind: "text",
      rules: {
        maxLength: 20,
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
    {
      name: "administratorId",
      label: "Quản trị viên",
      kind: "searchsingle",
      placeholder: "Tìm nhân sự theo chi nhánh...",
      fullWidth: true,
      showIf: (_, ctx) => resolveDeptId(ctx) > 0,
      getOptionLabel: (d: any) => d?.name ?? "",
      getInputLabel: (d: any) => d?.name ?? "",

      async searchPage(kw: string, page: number, limit: number, ctx?: FormContext) {
        const deptId = resolveDeptId(ctx);
        if (deptId <= 0) return [];
        const searched = await search<any>("staff_department", {
          keyword: kw,
          page,
          limit,
          orderBy: "name",
          extendWhere: [`s.department_id=${deptId}`],
        });
        return searched.items;
      },
      pageLimit: 20,

      async hydrateById(idValue: number | string) {
        if (!idValue) return null;
        return await rel1("staff_department", Number(idValue));
      },

      async fetchOne(values: Record<string, any>) {
        const idValue = Number(values.administratorId ?? 0);
        if (!idValue) return null;
        return await rel1("staff_department", idValue);
      },

      onOpenCreate: () => {
        const deptId = resolveDeptIdForCreateStaff();
        const initial = deptId > 0 ? { departmentId: deptId } : undefined;
        openFormDialog("staff-create", { initial });
      },
      autoLoadAllOnMount: true,
    },
  ];

  return {
    idField: "id",
    fields,
    submit: {
      create: {
        type: "fn",
        run: async (values) => {
          const deptId = Number(values.dto.parentId ?? values.dto.id ?? 0);
          return await create(deptId, values.dto as DeparmentModel);
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          const deptId = Number(values.dto.id ?? 0);
          return await update(deptId, values.dto as DeparmentModel);
        },
      },
    },
    async initialResolver(data: any) {
      if (data?.id) {
        return await getById(Number(data.id));
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
      mapToDto: (v) => mapper.map("Department", v, "model_to_dto"),
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
});
