import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerForm } from "@core/form/form-registry";
import { rel1, search } from "@core/relation/relation.api";
import { Box, Stack, Typography } from "@mui/material";
import { formatDateTime } from "@root/shared/utils/datetime.utils";
import { parseIntSafe } from "@root/shared/utils/number.utils";
import { assign } from "../api/order-item-process.api";
import { getContrastText } from "@root/shared/utils/color.utils";
import { invalidate } from "@root/core/hooks/use-async";
import { buildProductLabel } from "../utils/order.utils";

export function buildOrderProcessInProgressCurrentSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "processName",
      label: "Công đoạn",
      kind: "custom",
      render: ({ value, values, field }) => {
        const sectionName = values.sectionName?.trim();
        const processName = value?.trim();
        const text =
          sectionName && processName
            ? `${sectionName} > ${processName}`
            : sectionName || processName || "";
        const bgColor = values.color ?? undefined;
        const content = text || "—";

        return (
          <Stack spacing={0.5}>
            {buildProductLabel(values) ? (
              <Typography variant="caption" color="text.secondary">
                Sản phẩm: {buildProductLabel(values)}
              </Typography>
            ) : null}
            <Typography variant="caption" color="text.secondary">
              {field.label}
            </Typography>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 1,
                py: 0.5,
                borderRadius: 1,
                backgroundColor: bgColor ?? "transparent",
                color: getContrastText(bgColor),
              }}
            >
              <Typography variant="body2">{content}</Typography>
            </Box>
          </Stack>
        );
      },
    },
    {
      name: "assignedId",
      label: "Kỹ thuật viên",
      kind: "searchsingle",
      placeholder: "Chọn kỹ thuật viên",
      fullWidth: true,
      size: "small",
      pageLimit: 20,
      getOptionLabel: (d: any) => d?.name ?? "",
      getOptionValue: (d: any) => d?.id,
      async searchPage(keyword: string, page: number, limit: number) {
        const searched = await search("orderitemprocess_assignee", {
          keyword,
          page,
          limit,
          orderBy: "name",
        });
        return searched.items;
      },
      async hydrateById(idValue: number | string) {
        if (!idValue) return null;
        return await rel1("orderitemprocess_assignee", Number(idValue));
      },
      async fetchOne(values: Record<string, any>) {
        const refId = parseIntSafe(values.assignedId);
        if (!refId) return null;
        return await rel1("orderitemprocess_assignee", refId);
      },
      autoLoadAllOnMount: true,
    },
    {
      name: "startedAt",
      label: "Bắt đầu",
      kind: "custom",
      render: ({ value, field }) => {
        const content = formatDateTime(value) || "—";
        return (
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              {field.label}
            </Typography>
            <Typography>{content}</Typography>
          </Stack>
        );
      },
    },
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
    modeResolver: () => "update",
    submit: {
      type: "fn",
      run: async (result) => {
        const dto = result.dto;
        const inProgressId = parseIntSafe(dto.id);
        const assignedId = parseIntSafe(dto.assigned_id);
        await assign(
          inProgressId ?? 0,
          assignedId ?? 0,
          dto.assigned_name ?? "",
          dto.check_in_note ?? "",
        );
        return result;
      },
    },
    afterSaved(result, ctx) {
      console.log(result, ctx);
      const dto = result.dto;
      const orderId = dto.order_id;
      const orderItemId = dto.order_item_id;
      invalidate(`order-process-inprogress:${orderId}:${orderItemId}`);
    },
    async initialResolver(data: any) {
      return data ?? {};
    },
  };
}

registerForm("order-process-inprogress-current", buildOrderProcessInProgressCurrentSchema);
