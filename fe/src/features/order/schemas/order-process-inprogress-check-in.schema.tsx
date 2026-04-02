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
    buildRelationSearchSingleField(
      "processId",
      "Công đoạn",
      "Chọn công đoạn",
      "orderitem_process",
      (d: any) => d?.processName ?? "",
      (d: any) => `${d?.sectionName ? `${d?.sectionName} > ` : ""}${d?.processName ?? ""}`,
      "step_number",
      (ctx) => [`order_item_id=${ctx?.values.orderItemId}`, `order_id=${ctx?.values.orderId}`]
    ),
    buildRelationSearchSingleField(
      "assignedId",
      "Kỹ thuật viên",
      "Chọn kỹ thuật viên",
      "orderitemprocess_assignee",
      undefined,
      (d: any) => d?.name ?? "",
      "name",
    ),
    {
      name: "checkInNote",
      label: "Ghi chú nhận ca",
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
    async afterSaved(result, _ctx) {
      const orderId = (result.dto as any).order_id;
      const orderItemId = (result.dto as any).order_item_id;
      navigate(`/in-progresses/${orderId}/${orderItemId}`);
    },
    hooks: {
      mapToDto: (v) => mapper.map("OrderItemProcessInProgress", v, "model_to_dto"),
    },
  };
}

registerForm("order-process-inprogress-check-in", buildOrderProcessInProgressSchema);
registerFormDialog("order-process-inprogress-check-in", buildOrderProcessInProgressSchema, {
  title: { create: "", update: "Cập nhật công đoạn" },
  confirmText: { create: "", update: "Lưu" },
  cancelText: "Thoát",
});
