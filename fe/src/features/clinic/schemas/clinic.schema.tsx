import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { mapper } from "@core/mapper/auto-mapper";
import { registerForm } from "@core/form/form-registry";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@features/clinic/api/clinic.api";
import type { ClinicModel } from "@features/clinic/model/clinic.model";
import { uploadImages } from "@core/form/image-upload-utils";
import { openFormDialog } from "@root/core/form/form-dialog.service";
import { search as searchDentist, tableByClinicId as dentistsByClinicId } from "@root/features/dentist/api/dentist.api";
import { search as searchPatient, tableByClinicId as patientsByClinicId } from "@root/features/patient/api/patient.api";

export function buildClinicSchema(): FormSchema {
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
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "clinic",
        mode: "whole",
      }
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
    {
      name: "dentistIds",
      label: "Nha sĩ",
      kind: "searchlist",
      placeholder: "Tìm nha sĩ...",
      fullWidth: true,

      getOptionLabel: (d: any) => d?.name,
      getOptionValue: (d: any) => d?.id,

      async searchPage(kw: string, page, limit) {
        const searched = await searchDentist({
          keyword: kw,
          limit: limit,
          page: page,
          orderBy: "name",
        });
        return searched.items;
      },

      pageLimit: 20,

      async hydrateByIds(ids: Array<number | string>, values: Record<string, any>) {
        if (!ids || ids.length === 0) return [];
        const table = await dentistsByClinicId(values.id, {
          limit: 10000,
          page: 1,
          orderBy: "name",
        });
        const set = new Set(ids.map(String));
        return (table.items ?? []).filter((d: any) => set.has(String(d.id)));
      },

      async fetchList(values: Record<string, any>) {
        const table = await dentistsByClinicId(values.id, {
          limit: 20,
          page: 1,
          orderBy: "name",
        });
        return table.items;
      },

      renderItem: (d: any) => (<>{d.name}</>),
      disableDelete: (d: any) => d.locked === true,
      onOpenCreate: () => openFormDialog("dentist-non-clinic"),
      autoLoadAllOnMount: true,
    },
    {
      name: "patientIds",
      label: "Bệnh nhân",
      kind: "searchlist",
      placeholder: "Tìm bệnh nhân...",
      fullWidth: true,

      getOptionLabel: (d: any) => d?.name,
      getOptionValue: (d: any) => d?.id,

      async searchPage(kw: string, page, limit) {
        const searched = await searchPatient({
          keyword: kw,
          limit: limit,
          page: page,
          orderBy: "name",
        });
        return searched.items;
      },

      pageLimit: 20,

      async hydrateByIds(ids: Array<number | string>, values: Record<string, any>) {
        if (!ids || ids.length === 0) return [];
        const table = await patientsByClinicId(values.id, {
          limit: 10000,
          page: 1,
          orderBy: "name",
        });
        const set = new Set(ids.map(String));
        return (table.items ?? []).filter((d: any) => set.has(String(d.id)));
      },

      async fetchList(values: Record<string, any>) {
        const table = await patientsByClinicId(values.id, {
          limit: 20,
          page: 1,
          orderBy: "name",
        });
        return table.items;
      },

      renderItem: (d: any) => (<>{d.name}</>),
      disableDelete: (d: any) => d.locked === true,
      onOpenCreate: () => openFormDialog("patient-non-clinic"),
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

registerForm("clinic", buildClinicSchema);

registerFormDialog("clinic", buildClinicSchema, {
  title: { create: "Thêm nha khoa", update: "Cập nhật nha khoa" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});
