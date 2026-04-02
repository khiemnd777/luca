import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { mapper } from "@core/mapper/auto-mapper";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { reloadTable } from "@core/table/table-reload";
import type { DentistModel } from "@features/dentist/model/dentist.model";
import { create, id, update } from "@features/dentist/api/dentist.api";
import { search as searchClinic, tableByDentistId } from "@features/clinic/api/clinic.api";
import { openFormDialog } from "@core/form/form-dialog.service";
import { Badge } from "@root/shared/components/ui/badge";

export function buildDentistSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "name",
      label: "Tên nha sĩ",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên nha sĩ",
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
      name: "brief",
      label: "Mô tả",
      kind: "textarea",
      rules: {
        maxLength: 300,
      },
    },
    {
      name: "clinicIds",
      label: "Nha khoa",
      kind: "searchlist",
      placeholder: "Tìm nha khoa...",
      fullWidth: true,

      getOptionLabel: (d: any) => d?.name,
      getOptionValue: (d: any) => d?.id,

      async searchPage(kw: string, page, limit) {
        const searched = await searchClinic({
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
        const table = await tableByDentistId(values.id, {
          limit: 20,
          page: 1,
          orderBy: "name",
        });
        const set = new Set(ids.map(String));
        return (table.items ?? []).filter((d: any) => set.has(String(d.id)));
      },

      async fetchList(values: Record<string, any>) {
        const table = await tableByDentistId(values.id, {
          limit: 20,
          page: 1,
          orderBy: "name",
        });
        return table.items;
      },

      renderItem: (d: any) => (
        <> <Badge badge={{ name: d.name, avatar: d.logo }} /> </>
      ),
      disableDelete: (d: any) => d.locked === true,
      onOpenCreate: () => openFormDialog("clinic-non-dentist"),
      autoLoadAllOnMount: true,
    }
  ];

  return {
    idField: "id",
    fields,
    submit: {
      create: {
        type: "fn",
        run: async (values) => {
          await create(values.dto as DentistModel);
          return values.dto;
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          await update(values.dto as DentistModel);
          return values.dto;
        },
      },
    },

    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo nha sĩ "${values?.name ?? ""}" thành công!`
          : `Cập nhật nha sĩ "${values?.name ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo nha sĩ "${values?.name ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật nha sĩ "${values?.name ?? ""}" thất bại, xin thử lại!`,
    },

    async initialResolver(data: any) {
      if (data) {
        return await id(data.id);
      }
      return {};
    },

    async afterSaved() {
      reloadTable("dentists");
    },

    hooks: {
      mapToDto: (v) => mapper.map("Dentist", v, "model_to_dto"),
    },
  };
}

registerFormDialog("dentist", buildDentistSchema, {
  title: { create: "Thêm nha sĩ", update: "Cập nhật nha sĩ" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});
