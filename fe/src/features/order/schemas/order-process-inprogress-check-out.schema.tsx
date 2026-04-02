import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef, FormContext } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerForm } from "@core/form/form-registry";
import { registerFormDialog } from "@root/core/form/form-dialog.registry";
import { rel1, search } from "@core/relation/relation.api";
import { parseIntSafe } from "@root/shared/utils/number.utils";
import type { OrderItemProcessUpsertModel } from "../model/order-item-process.model";
import { checkInOrOut } from "../api/order-item-process.api";
import { navigate } from "@root/core/navigation/navigate";

const buildRelationSearchSingleField = (
  name: string,
  label: string,
  placeholder: string,
  target: string,
  getInputLabel?: (item: any) => string,
  getOptionLabel?: (item: any, items?: any[]) => string,
  orderBy?: string,
  extendWhere?: (ctx?: FormContext) => string[],
  asText?: boolean,
  showIf?: ((values: Record<string, any>, ctx?: FormContext) => boolean) | undefined,
): FieldDef => ({
  name,
  label,
  kind: "searchsingle",
  placeholder,
  fullWidth: true,
  size: "small",
  pageLimit: 20,
  getInputLabel,
  getOptionLabel,
  showIf,
  asText,
  async searchPage(keyword: string, page: number, limit: number, ctx?: FormContext) {
    const searched = await search(target, {
      keyword,
      page,
      limit,
      orderBy,
      extendWhere: extendWhere?.(ctx),
    });
    return searched.items;
  },
  async hydrateById(idValue: number | string) {
    if (!idValue) return null;
    return await rel1(target, Number(idValue));
  },
  async fetchOne(values: Record<string, any>) {
    const refId = parseIntSafe(values[name]);
    if (!refId) return null;
    return await rel1(target, refId);
  },
  autoLoadAllOnMount: true,
});

export function buildOrderProcessInProgressSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      kind: "searchsingle",
      label: "Công đoạn hiện tại",
      name: "processId",
      getOptionLabel: (d: any) => `${d?.sectionName ? `${d?.sectionName} > ` : ""}${d?.processName ?? ""}`,
      async hydrateById(idValue: number | string) {
        if (!idValue) return null;
        return await rel1("orderitem_process", Number(idValue));
      },
      asText: true,
    },
    {
      kind: "searchsingle",
      label: "Kỹ thuật viên",
      name: "assignedId",
      getOptionLabel: (d: any) => d?.name ?? "",
      async hydrateById(idValue: number | string) {
        if (!idValue) return null;
        return await rel1("orderitemprocess_assignee", Number(idValue));
      },
      asText: true,
    },
    {
      kind: "datetime",
      label: "Bắt đầu lúc",
      name: "startedAt",
      asText: true,
    },
    {
      label: "Ghi chú nhận ca",
      kind: "textarea",
      name: "checkInNote",
      asText: true,
    },
    buildRelationSearchSingleField(
      "nextProcessId",
      "Công đoạn tiếp theo",
      "Chọn công đoạn",
      "orderitem_process",
      (d: any) => d?.processName ?? "",
      (d: any) => `${d?.sectionName ? `${d?.sectionName} > ` : ""}${d?.processName ?? ""}`,
      "step_number",
      (ctx) => [`order_item_id=${ctx?.values.orderItemId}`, `order_id=${ctx?.values.orderId}`],
    ),
    {
      name: "checkOutNote",
      label: "Ghi chú giao ca",
      kind: "textarea",
      fullWidth: true,
      rows: 3,
    },
  ];

  return {
    idField: "id",
    fields,
    submit: {
      type: "fn",
      run: async (dto) => {
        const payload = dto as OrderItemProcessUpsertModel;
        await checkInOrOut(payload.dto);
        return dto;
      },
    },
    toasts: {
      saved: ({ values }) =>
        `Check ${values?.processName ?? ""} thành công!`,
      failed: ({ values }) =>
        `Check ${values?.processName ?? ""} thất bại!`,
    },
    async initialResolver(data: any) {
      return data ?? {};
    },
    async afterSaved(result, ctx) {
      console.log("ctx", ctx, "result", result);
      const orderId = (result.dto as any).order_id;
      const orderItemId = (result.dto as any).order_item_id;
      navigate(`/in-progresses/${orderId}/${orderItemId}`);
    },
    hooks: {
      mapToDto: (v) => mapper.map("OrderItemProcessInProgress", v, "model_to_dto"),
    },
  };
}

registerForm("order-process-inprogress-check-out", buildOrderProcessInProgressSchema);
registerFormDialog("order-process-inprogress-check-out", buildOrderProcessInProgressSchema, {
  title: { create: "", update: "Cập nhật công đoạn" },
  confirmText: { create: "", update: "Lưu" },
  cancelText: "Thoát",
});
